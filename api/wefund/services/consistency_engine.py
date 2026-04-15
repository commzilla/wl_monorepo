import json
from decimal import Decimal
from typing import Dict, Any
from django.utils import timezone
from wefund.models import TraderPayout, ChallengeEnrollment, MT5Trade, PayoutConsistencyReport
from anthropic import Anthropic


CONSISTENCY_PROMPT = """
You are the WeFund Consistency Rule Analyzer.

CRITICAL: All mathematical calculations have been PRE-VERIFIED in Python.
Your job is ONLY to:
1. Interpret the pre-calculated results
2. Classify the severity
3. Write messages to the trader

DO NOT recalculate anything. DO NOT perform arithmetic. 
USE ONLY the numbers provided in "verified_calculations".

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

You will receive an account with:
1. Basic account info (account_type, dates, etc.)
2. List of trades (for reference only - DO NOT process these)
3. "verified_calculations" object with PRE-CALCULATED violations

CRITICAL RULES:
- DO NOT sum trade profits yourself
- DO NOT calculate percentages yourself  
- DO NOT determine violations yourself
- USE ONLY the values in "verified_calculations"
- TRUST the Python calculations completely

═══════════════════════════════════════════════════════════════════════════════
CONSISTENCY RULES (FOR REFERENCE)
═══════════════════════════════════════════════════════════════════════════════

Rules apply ONLY to 1-Step Live accounts:

RULE 1: DAILY PROFIT LIMIT (30%)
───────────────────────────────────────────────────────────────────────────────
No single day's profit can exceed 30% of total cycle profit.

Calculation:
1.⁠ ⁠Calculate total cycle profit = sum of all daily P&L (only positive days if overall positive)
2.⁠ ⁠Calculate 30% threshold = total cycle profit × 0.30
3.⁠ ⁠For each day, if daily P&L > threshold → VIOLATION
4.⁠ ⁠Deduction = daily_profit - threshold  (only the amount exceeding the cap)

Example:
•⁠  ⁠Total cycle profit: $1,000
•⁠  ⁠Threshold: $300 (30% of $1,000)
•⁠  ⁠Nov 15: +$450 → VIOLATION (exceeds $300)
•⁠  ⁠Exceeded_by: $150
•⁠  ⁠Deduction: $150 (not $450)
2. SINGLE TRADE LIMIT: No trade can exceed 30% of total profit  
3. LOT CONSISTENCY: Lots must be 30%-200% of average (warning only)

Soft Breach: Deductions ≥ 10% of profit → Reject payout, account stays active
Severe: Deductions ≥ 50% of profit → Reject payout, flag for review

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

You MUST output ONLY valid JSON. No markdown, no code blocks.

{
  "consistency_analysis": {
    "applicable": boolean,
    "account_type": string,
    "reason_not_applicable": string | null,
    
    "financial_summary": {
      "total_cycle_profit": number,  // FROM verified_calculations.total_profit
      "threshold_30_percent": number,  // FROM verified_calculations.threshold_30pct
      "total_deductions": number,  // FROM verified_calculations.total_deductions
      "deduction_percentage": number,  // FROM verified_calculations.deduction_percentage
      "adjusted_profit": number  // FROM verified_calculations.adjusted_profit
    },
    
    "daily_violations": [],  // FROM verified_calculations.daily_violations (pass through)
    
    "single_trade_violations": [],  // FROM verified_calculations.single_trade_violations (pass through)
    
    "aggregated_trade_violations": [],  // Empty for now (not calculated yet)
    
    "lot_size_violations": [],  // FROM verified_calculations.lot_violations (pass through)
    
    "summary": {
      "total_daily_violations": integer,  // COUNT of daily_violations array
      "total_single_trade_violations": integer,  // COUNT of single_trade_violations array
      "total_aggregated_violations": 0,
      "total_lot_violations": integer,  // COUNT of lot_violations array
      "daily_deductions": number,  // FROM verified_calculations.daily_deduction_amount
      "single_trade_deductions": number,  // FROM verified_calculations.single_deduction_amount
      "aggregated_deductions": 0.00,
      "total_deductions": number  // FROM verified_calculations.total_deductions
    },
    
    "classification": {
      "status": "PASS_CLEAN" | "PASS_WITH_WARNINGS" | "SOFT_BREACH" | "SEVERE_VIOLATIONS" | "NOT_APPLICABLE",
      "verdict": "pass" | "reject" | "not_applicable",
      "deduction_percentage": number,  // FROM verified_calculations.deduction_percentage
      "severity_level": "none" | "minor" | "moderate" | "severe"
    },
    
    "payout_calculation": {
      "original_profit": number,  // FROM verified_calculations.total_profit
      "total_deductions": number,  // FROM verified_calculations.total_deductions
      "adjusted_profit": number,  // FROM verified_calculations.adjusted_profit
      "approved_payout": number,  // 0 if rejected, adjusted_profit if approved
      "payout_status": "approved_full" | "approved_reduced" | "declined"
    },
    
    "recommendations": {
      "action": "approve_full" | "approve_reduced" | "decline_soft_breach" | "decline_severe",
      "account_status": "active" | "active_with_warning" | "review_required",
      "message_to_trader": string,
      "internal_notes": string
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
CLASSIFICATION LOGIC
═══════════════════════════════════════════════════════════════════════════════

Use verified_calculations.deduction_percentage to classify:

If deduction_percentage == 0:
  status = "PASS_CLEAN"
  verdict = "pass"
  approved_payout = total_cycle_profit
  payout_status = "approved_full"
  action = "approve_full"

Else if deduction_percentage < 10:
  status = "PASS_WITH_WARNINGS"  
  verdict = "pass"
  approved_payout = adjusted_profit
  payout_status = "approved_reduced"
  action = "approve_reduced"

Else if deduction_percentage < 50:
  status = "SOFT_BREACH"
  verdict = "reject"
  approved_payout = 0.00
  payout_status = "declined"
  action = "decline_soft_breach"

Else:
  status = "SEVERE_VIOLATIONS"
  verdict = "reject"  
  approved_payout = 0.00
  payout_status = "declined"
  action = "decline_severe"

If account_type != "1-Step Live":
  status = "NOT_APPLICABLE"
  verdict = "not_applicable"
  approved_payout = total_cycle_profit
  payout_status = "approved_full"

═══════════════════════════════════════════════════════════════════════════════
MESSAGE TEMPLATES
═══════════════════════════════════════════════════════════════════════════════

PASS_CLEAN:
"Congratulations! Your payout has been approved. No consistency violations detected. Your trading demonstrates excellent risk management."

PASS_WITH_WARNINGS:
"Your payout has been approved with minor deductions. We found [X] consistency violations totaling [X]% of your profit. Adjusted payout: $[X]. Please review our consistency rules to avoid larger deductions in future cycles."

SOFT_BREACH:
"Your payout request has been declined due to consistency rule violations. Total deductions of [X]% exceed our 10% soft breach threshold. [Briefly describe violations]. Your account remains active. Please review our consistency rules carefully before your next payout request."

SEVERE_VIOLATIONS:
"Your payout request has been declined due to severe consistency violations. Total deductions of [X]% indicate [describe pattern - e.g., 'extreme profit concentration']. [Briefly describe violations]. Your account is flagged for review. Please contact support."

NOT_APPLICABLE:
"Consistency rules do not apply to [account_type] accounts. Full payout approved."

═══════════════════════════════════════════════════════════════════════════════
CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════════════════════

1. DO NOT calculate anything - use verified_calculations values
2. Simply transfer the pre-calculated violations arrays to output
3. Count array lengths for summary counts
4. Apply classification logic based on deduction_percentage
5. Write clear, professional messages to trader
6. Output ONLY valid JSON, no markdown

WAIT FOR ACCOUNT DATA WITH verified_calculations OBJECT.
"""


class WeFundConsistencyEngine:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)

    def build_account_payload(self, payout: TraderPayout) -> Dict[str, Any]:
        enrollment = payout.challenge_enrollment
        if not enrollment:
            raise ValueError("Payout missing challenge enrollment")

        account_id = enrollment.mt5_account_id
        if not account_id:
            raise ValueError("Enrollment has no MT5 account ID")

        # ---------- 1. Identify payout window ----------
        # ---------- 1. Identify payout window ----------
        last_payout = TraderPayout.objects.filter(
            challenge_enrollment=enrollment,
            status__in=["paid", "approved"]
        ).exclude(id=payout.id).order_by("-requested_at").first()

        if last_payout:
            start_time = last_payout.requested_at
        else:
            start_time = enrollment.start_date  # For first payout

        end_time = payout.requested_at


        # ---------- 2. Fetch only relevant trades ----------
        trades = MT5Trade.objects.filter(
            account_id=account_id,
            is_closed=True,
            close_time__gte=start_time,
            close_time__lte=end_time
        ).order_by("close_time")

        trade_list = [{
            "ticket_id": t.order,
            "symbol": t.symbol,
            "type": "BUY" if t.cmd == 0 else "SELL",
            "volume": float(t.volume),
            "open_time": t.open_time.isoformat(),
            "close_time": t.close_time.isoformat(),
            "profit": float(t.profit)
        } for t in trades]

        # ---------- 3. Determine account type ----------
        step_type = enrollment.challenge.step_type
        account_type = (
            "1-Step Live" if step_type == "1-step" and "live" in enrollment.status
            else "1-Step Phase 1" if step_type == "1-step"
            else "2-Step Live" if "live" in enrollment.status
            else "2-Step Phase 1"
        )

        # ---------- 4. Inject payout metadata ----------
        return {
            "account_number": account_id,
            "account_type": account_type,
            "cycle_start_date": start_time.isoformat(),
            "cycle_end_date": end_time.isoformat(),
            "payout_info": {
                "requested_amount": float(payout.profit or 0),
                "net_amount": float(payout.net_profit or 0),
                "profit_share": float(payout.profit_share or 0),
                "window_start": start_time.isoformat(),
                "window_end": end_time.isoformat(),
                "total_trades_in_window": trades.count()
            },
            "cycle_info": {
                "mt5_raw_profit": float(sum(t['profit'] for t in trade_list)),
                "payout_cycle_profit": float(payout.profit),
                "difference_reason": "profit share applied + window restricted trades"
            },
            "trades": trade_list
        }
    
    def calculate_violations(self, trades_list: list, cycle_profit: float):
        """
        Pre-calculate ALL math in Python to prevent AI hallucinations.
        Claude will only interpret these verified numbers.
        """
        import pandas as pd
        from datetime import datetime
        
        # Convert to DataFrame for easy analysis
        df = pd.DataFrame(trades_list)
        
        if len(df) == 0:
            return {
                "total_profit": 0.0,
                "threshold_30pct": 0.0,
                "daily_violations": [],
                "single_trade_violations": [],
                "lot_violations": [],
                "total_deductions": 0.0
            }
        
        # Calculate total profit
        total_profit = float(cycle_profit)

        
        # If unprofitable, no violations possible
        if total_profit <= 0:
            return {
                "total_profit": total_profit,
                "threshold_30pct": 0.0,
                "daily_violations": [],
                "single_trade_violations": [],
                "lot_violations": [],
                "total_deductions": 0.0
            }
        
        threshold = total_profit * 0.30
        
        # 1. DAILY VIOLATIONS
        df['trade_date'] = pd.to_datetime(df['close_time']).dt.date
        daily_pnl = df.groupby('trade_date').agg({
            'profit': 'sum',
            'ticket_id': list
        }).reset_index()
        
        daily_violations = []
        for _, row in daily_pnl.iterrows():
            if row['profit'] > threshold:
                exceeded_by = row['profit'] - threshold
                daily_violations.append({
                    'date': str(row['trade_date']),
                    'daily_profit': float(row['profit']),
                    'percentage': float((row['profit'] / total_profit) * 100),
                    'threshold': float(threshold),
                    'exceeded_by': float(exceeded_by),
                    "deduction": float(exceeded_by),  # Deduct only the excess amount
                    'trade_count': len(row['ticket_id']),
                    'trade_ids': row['ticket_id']
                })
        
        # 2. SINGLE TRADE VIOLATIONS (excluding trades in daily violations)
        daily_violation_trade_ids = set()
        for dv in daily_violations:
            daily_violation_trade_ids.update(dv['trade_ids'])
        
        single_violations = []
        for _, trade in df.iterrows():
            # Skip if already part of daily violation
            if trade['ticket_id'] in daily_violation_trade_ids:
                continue

            if trade['profit'] > threshold:
                exceeded_by = trade['profit'] - threshold
                single_violations.append({
                    'ticket_id': int(trade['ticket_id']),
                    'symbol': trade['symbol'],
                    'trade_profit': float(trade['profit']),
                    'percentage': float((trade['profit'] / total_profit) * 100),
                    'threshold': float(threshold),
                    'exceeded_by': float(exceeded_by),
                    'deduction': float(exceeded_by),  # Deduct only the excess amount
                    'date': str(pd.to_datetime(trade['close_time']).date()),
                    'time': pd.to_datetime(trade['close_time']).strftime('%H:%M:%S')
                })
        
        # 3. LOT SIZE VIOLATIONS (warnings only)
        avg_lot = float(df['volume'].mean())
        min_lot = avg_lot * 0.30
        max_lot = avg_lot * 2.00
        
        lot_violations = []
        for _, trade in df.iterrows():
            if trade['volume'] < min_lot:
                lot_violations.append({
                    'ticket_id': int(trade['ticket_id']),
                    'symbol': trade['symbol'],
                    'lot_size': float(trade['volume']),
                    'average_lot': float(avg_lot),
                    'min_allowed': float(min_lot),
                    'max_allowed': float(max_lot),
                    'violation_type': 'too_small',
                    'severity': 'warning'
                })
            elif trade['volume'] > max_lot:
                lot_violations.append({
                    'ticket_id': int(trade['ticket_id']),
                    'symbol': trade['symbol'],
                    'lot_size': float(trade['volume']),
                    'average_lot': float(avg_lot),
                    'min_allowed': float(min_lot),
                    'max_allowed': float(max_lot),
                    'violation_type': 'too_large',
                    'severity': 'warning'
                })
        
        # Calculate total deductions (no double-counting)
        daily_deductions = sum(v['deduction'] for v in daily_violations)
        single_deductions = sum(v['deduction'] for v in single_violations)
        total_deductions = daily_deductions + single_deductions
        
        return {
            "total_profit": float(total_profit),
            "threshold_30pct": float(threshold),
            "daily_violations": daily_violations,
            "single_trade_violations": single_violations,
            "lot_violations": lot_violations,
            "total_deductions": float(total_deductions),
            "deduction_percentage": float((total_deductions / total_profit) * 100) if total_profit > 0 else 0.0,
            "adjusted_profit": float(total_profit - total_deductions),
            "daily_deduction_amount": float(daily_deductions),
            "single_deduction_amount": float(single_deductions)
        }

    def run_ai_analysis(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        # PRE-CALCULATE ALL MATH IN PYTHON (prevents hallucinations)
        violations = self.calculate_violations(
            trades_list=account_data['trades'],
            cycle_profit=account_data["payout_info"]["requested_amount"]
        )

        
        # Add pre-calculated results to payload
        account_data['verified_calculations'] = violations
        
        user_message = json.dumps(account_data, indent=2)

        response = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=20000,
            temperature=0,
            system=CONSISTENCY_PROMPT,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )

        raw = response.content[0].text.strip()

        # 1. Empty?
        if not raw:
            raise ValueError("Claude returned EMPTY response")

        # 2. Remove markdown wrappers if present
        # --------------------------------------------------
        # Example Claude output:
        # ```json
        # { ... }
        # ```
        # --------------------------------------------------

        # Remove ```json or ``` wrapper blocks
        if raw.startswith("```"):
            raw = raw.strip("`")               # remove backticks
            raw = raw.replace("json", "", 1)   # remove 'json' identifier
            raw = raw.strip()

        # Sometimes Claude returns: ```json\n{...}\n```
        if raw.startswith("{") is False:
            # try to extract the JSON between first { and last }
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                raw = raw[start:end+1]

        # 3. Validate again
        if not raw.startswith("{"):
            raise ValueError(f"Claude returned invalid or wrapped JSON:\n\n{raw}")

        # 4. Try JSON parsing
        try:
            parsed = json.loads(raw)
            return {
                "parsed": parsed,
                "raw": raw,
                "request": account_data
            }
        except Exception as e:
            raise ValueError(f"Claude returned MALFORMED JSON:\n\n{raw}\n\nError: {e}")


    def save_report(self, payout: TraderPayout, analysis: Dict[str, Any],
                ai_request=None, ai_raw_response=None, ai_parsed=None) -> PayoutConsistencyReport:

        ca = analysis["consistency_analysis"]

        # -----------------------------
        # SANITY CHECKS (catch hallucinations)
        # -----------------------------
        fin = ca["financial_summary"]
        payout_calc = ca["payout_calculation"]

        # Check 1: Approved payout cannot exceed total original cycle profit
        if payout_calc["approved_payout"] > fin["total_cycle_profit"]:
            raise ValueError(
                f"HALLUCINATION DETECTED: Approved ${payout_calc['approved_payout']} "
                f"exceeds total profit ${fin['total_cycle_profit']}"
            )

        # Check 2: Valid deduction percentage
        if not (0 <= fin["deduction_percentage"] <= 200):
            raise ValueError(
                f"HALLUCINATION DETECTED: Deduction percentage {fin['deduction_percentage']}% "
                f"is impossible (must be 0–200%)"
            )

        # Check 3: Adjusted profit math must match total_profit - total_deductions
        calculated_adjusted = fin["total_cycle_profit"] - fin["total_deductions"]
        if abs(calculated_adjusted - fin["adjusted_profit"]) > 0.01:
            raise ValueError(
                f"HALLUCINATION DETECTED: Adjusted profit ${fin['adjusted_profit']} "
                f"does not match expected ${calculated_adjusted}"
            )

        # Check 4: Verdict must match deduction percentage threshold rules
        deduction_pct = fin["deduction_percentage"]
        verdict = ca["classification"]["verdict"]

        if deduction_pct >= 10 and verdict == "pass":
            raise ValueError(
                f"HALLUCINATION DETECTED: {deduction_pct}% deductions require rejection, "
                f"but verdict was 'pass'"
            )

        if deduction_pct < 10 and verdict == "reject":
            raise ValueError(
                f"HALLUCINATION DETECTED: {deduction_pct}% deductions require approval, "
                f"but verdict was 'reject'"
            )

        # -----------------------------
        # CREATE CONSISTENCY REPORT
        # -----------------------------
        report = PayoutConsistencyReport.objects.create(
            payout=payout,
            enrollment=payout.challenge_enrollment,
            account_id=ca.get("account_number", payout.challenge_enrollment.mt5_account_id),
            account_type=ca.get("account_type", ""),
            analysis=analysis,
            verdict=verdict,
            deduction_percentage=fin["deduction_percentage"],
            approved_amount=payout_calc["approved_payout"],
            payout_status=payout_calc["payout_status"],
            reason=ca["recommendations"]["message_to_trader"],
            ai_request=ai_request,
            ai_raw_response=ai_raw_response,
            ai_parsed_response=ai_parsed
        )

        return report

    def run_for_payout(self, payout_id: str) -> PayoutConsistencyReport:
        # 1) Load payout
        payout = TraderPayout.objects.get(id=payout_id)

        # 2) Build input payload (trades, dates, account info)
        account_payload = self.build_account_payload(payout)

        # 3) Run AI (now returns parsed, raw, request)
        ai_result = self.run_ai_analysis(account_payload)

        parsed_analysis = ai_result["parsed"]       # Clean JSON (used for report logic)
        raw_response = ai_result["raw"]             # Raw AI output (for logging)
        request_sent = ai_result["request"]         # Full JSON sent to Claude

        # 4) Save report with request + response logs
        report = self.save_report(
            payout=payout,
            analysis=parsed_analysis,
            ai_request=request_sent,
            ai_raw_response=raw_response,
            ai_parsed=parsed_analysis
        )

        return report