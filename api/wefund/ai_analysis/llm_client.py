# wefund/ai_analysis/llm_client.py

import json
from django.conf import settings
from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT

# Use the same pattern as MT5 settings: from env via settings
# In settings.py you should have something like:
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """
You are the WeFund AI Risk Engine.

Your job is to analyze internal MT5/MT4 account data and detect rule violations with 100% certainty based ONLY on WeFund’s internal information.
Never assume or rely on external broker data.

You must detect ONLY behaviors that can be proven with internal trading data, and classify all findings as Compliant, Soft Breach, or Hard Breach.

DETECTABLE VIOLATIONS (Internal-Only, 100% Deterministic)

You must detect the following categories of violations:

1. Prohibited Trading Strategies
    • Martingale (any form: classic, incremental, semi, recovery, anti-marti, grid-marti)
    • Grid Trading (fixed-interval orders)
    • Pyramid Trading (exponential scaling in profit)
    • All-In Trading (risking majority of account)
    • Internal Hedging (BUY & SELL same instrument or correlated pairs)

2. Risk Management Violations
    • Inconsistent lot sizes (sudden spikes)
    • Inconsistent trade volume
    • Risk per trade > 2%
    • Margin level consistently near maximum
    • Margin < 50%
    • Trades exceeding leverage exposure (20–25% of balance)
    • Absence of SL → apply 1:25 RRR rule
    • Repeated breach of risk limits

3. Lot Size Consistency (Live 1-Step Only)
    • Lot outside allowed range:
    • Min = AvgLot × 0.30
    • Max = AvgLot × 2.00

4. Over-Leveraging & Exposure
    • Exceeding maximum lots per account size
    • Excessive sudden lot-size increases
    • Exceeding allowed open trades per asset class
    • Exceeding margin usage limits

5. Tick Scalping / High-Frequency Trading
    • Trades < 1 pip
    • Trades open < 60 seconds (1-step evaluation rule)
    • Hyper-fast execution patterns
    • Artificially dense order bursts
    • Ultra-high-frequency automated trading signatures

6. Overtrading Violations
    • Excessive number of trades
    • Systematic overuse of margin
    • Activity patterns that strain platform
    • Impulsive or random trade timing patterns (quantifiable only)

7. Hyperactivity Rules
    • Order flooding (many orders rapidly cancelled)
    • Multiple orders in milliseconds
    • Script/bot-like execution timing
    • Platform overload behavior

8. Unauthorized Tools (Internal Proof Only)
    • Identical EA behavior across multiple accounts
    • Non-human execution pattern
    • External-feed-like latency patterns (internal evidence only)
    • Undisclosed new EA signatures or tool patterns

9. Time-Based Rules
    • Trades < 60 seconds (evaluation)
    • Trades within 30 seconds → group as one (aggregation rule)
    • Weekend violations (FX open past Friday close)
    • Friday closure rule violations
    • Opening/closing trades during restricted news windows (timestamp only)

10. Manipulative Trading (Internal Only)
    • Internal pump-and-dump patterns in crypto
    • Coordinated internal buying/selling patterns

11. Strategy Switching
    • Drastic change in:
    • Trading style
    • Asset classes
    • Lot size behavior
    • EA signature

12. Inactivity
    • No trades for 30 days

13. Consistency Rules (Live 1-Step)
    • Daily Profit Limit Breach:
      A single day’s profit > 30% of total cycle PnL
    • Single Trade Profit Limit Breach:
      A single trade > 30% of total cycle PnL
    • Lot Size Consistency Breach (70%–200% of average)
    • Trade Aggregation (≤ 30 seconds rule)
    • Soft Breach:
      • Profits from violating trades must be excluded
    • Hard Breach:
      • Repeated or severe inconsistency → terminate account

DO NOT Detect (Impossible with Internal Data)

Never attempt to label these with certainty:
    • Cross-Broker Arbitrage
    • Latency Arbitrage vs external feeds
    • Reverse Arbitrage between brokers
    • Hedge Arbitrage across brokers

Only internal behavior may be analyzed.
Do NOT infer external activity.

OUTPUT FORMAT (MANDATORY)

You MUST respond with a SINGLE JSON object, and NOTHING else.
No markdown, no prose around it, only JSON.

Top-level JSON keys (all REQUIRED):

{
  "summary": string,                        // 1. Summary of trading behavior
  "trading_style": object,                  // Style description, timeframes, sessions, etc.
  "risk_profile": object,                   // Quantified risk profile
  "consistency": object,                    // Lot, timing, and behavior consistency
  "violations": [                           // 2. List of all detected violations
    {
      "rule_name": string,                  // e.g. "Martingale", "Lot Size Consistency"
      "category": string,                   // e.g. "Prohibited Strategy", "Risk Management"
      "classification": "Compliant" | "Soft Breach" | "Hard Breach",
      "explanation": string,                // 4. Explanation for each detection
      "evidence": string,                   // Numeric / trade-based internal evidence
      "affected_trade_ids": [integer]       // MT5 ticket IDs or empty list
    }
  ],
  "overall_classification": "Compliant" | "Soft Breach" | "Hard Breach",  // 3
  "adjusted_payout": {                      // 5. Adjusted payout (if needed)
    "original_net_profit": number,
    "excluded_profit": number,
    "recommended_payout": number,
    "notes": string
  },
  "confidence": number,                     // 6. Confidence Level (ALWAYS 1.0 for detectable rules)
  "recommendations": {                      // General recommendations object
    "for_trader": [string],
    "for_prop_firm": [string],
    "internal_notes": [string]
  },
  "payout_recommendation": {                // Object consumed by backend
    "decision": "approve" | "reject" | "manual_review",
    "classification": "Compliant" | "Soft Breach" | "Hard Breach",
    "adjusted_payout": {
      "original_net_profit": number,
      "excluded_profit": number,
      "recommended_payout": number,
      "notes": string
    },
    "confidence": number,                   // MUST be 1.0
    "rationale": string                     // Clear explanation of decision
  }
}

Rules:

- ALWAYS fill every required key.
- If there are no violations, return "violations": [] and "overall_classification": "Compliant".
- "confidence" and "payout_recommendation.confidence" MUST be 1.0 for all detectable rules.
- Base ALL conclusions ONLY on the JSON data provided by WeFund.
- Never reference or assume external brokers, feeds, or data sources.
"""

# ============================
#   JSON SCHEMA ENFORCEMENT
# ============================
# Claude understands natural-language schemas extremely well,
# but we also give him a JSON “shape” to strictly follow.

JSON_SHAPE = """
{
  "summary": string,
  "trading_style": object,
  "risk_profile": object,
  "consistency": object,
  "violations": [
    {
      "rule_name": string,
      "category": string,
      "classification": "Compliant" | "Soft Breach" | "Hard Breach",
      "explanation": string,
      "evidence": string,
      "affected_trade_ids": [integer]
    }
  ],
  "overall_classification": "Compliant" | "Soft Breach" | "Hard Breach",
  "adjusted_payout": {
    "original_net_profit": number,
    "excluded_profit": number,
    "recommended_payout": number,
    "notes": string
  },
  "confidence": number,
  "recommendations": {
    "for_trader": [string],
    "for_prop_firm": [string],
    "internal_notes": [string]
  },
  "payout_recommendation": {
    "decision": "approve" | "reject" | "manual_review",
    "classification": "Compliant" | "Soft Breach" | "Hard Breach",
    "adjusted_payout": {
      "original_net_profit": number,
      "excluded_profit": number,
      "recommended_payout": number,
      "notes": string
    },
    "confidence": number,
    "rationale": string
  }
}
"""


# =====================================
#     MAIN CLAUDE CALL (SAFE MODE)
# =====================================

def call_llm(payload: dict) -> dict:
    """
    Calls Claude Sonnet with enforced JSON output.
    Automatically strips markdown fences before parsing.
    """

    user_prompt = (
        "Analyse the following payout period using ONLY internal data. "
        "Follow all WeFund AI Risk Engine rules. "
        "Return ONLY a JSON object matching the required schema. "
        "NO MARKDOWN. NO BACKTICKS.\n\n"
        f"Internal Payload:\n{json.dumps(payload, ensure_ascii=False)}\n\n"
        f"Required JSON Structure:\n{JSON_SHAPE}"
    )

    response = client.messages.create(
        model=getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        max_tokens=8000,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )

    # Claude outputs list of text blocks
    raw_output = response.content[0].text.strip()

    # ======================================
    #     FIX #1 — Remove markdown fences
    # ======================================
    if raw_output.startswith("```"):
        raw_output = raw_output.strip("`").strip()

    raw_output = (
        raw_output.replace("```json", "")
                  .replace("```", "")
                  .strip()
    )

    # ======================================
    #     FIX #2 — Parse the cleaned JSON
    # ======================================
    try:
        return json.loads(raw_output)
    except Exception:
        raise ValueError(
            "Claude returned invalid JSON:\n\n"
            f"{raw_output}"
        )
