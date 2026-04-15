"""
Enhanced prompt builder with knowledge injection and few-shot learning.
Version 2.0 - Gemini optimized with JSON output.
"""
import json
from wefund.models import AIRiskRule
from wefund.ai_risk.knowledge_base import RISK_KNOWLEDGE_BASE, PATTERN_DETECTION_GUIDELINES
from wefund.ai_risk.training_service import RiskTrainingService

PROMPT_VERSION = "2.0"


def build_ai_risk_prompt(*, context: dict) -> dict:
    """
    Build comprehensive prompt with:
    1. Risk knowledge base (prohibited strategies)
    2. Active policy rules from database
    3. Few-shot learning examples from human feedback
    4. Structured JSON output requirements
    """

    # Load active rules from database (existing RAG pattern)
    rules = AIRiskRule.objects.filter(is_active=True).order_by("severity", "code")
    rules_block = [
        {
            "code": rule.code,
            "name": rule.name,
            "severity": rule.severity,
            "description": rule.description,
            "detection_guidelines": rule.detection_guidelines,
        }
        for rule in rules
    ]

    # Get training examples from human feedback (few-shot learning)
    training_examples = RiskTrainingService.get_relevant_examples(
        detected_patterns=[],
        max_examples=5
    )
    training_section = RiskTrainingService.format_for_prompt(training_examples)

    # Build comprehensive system prompt
    system_prompt = f"""
{RISK_KNOWLEDGE_BASE}

## ACTIVE POLICY RULES (AUTHORITATIVE)
These are the current enforcement rules from the database. Follow severity levels exactly.

{json.dumps(rules_block, indent=2)}

## PATTERN DETECTION GUIDELINES
{json.dumps(PATTERN_DETECTION_GUIDELINES, indent=2)}

{training_section}

## OUTPUT REQUIREMENTS (STRICT JSON)

You MUST respond with valid JSON only. No markdown, no text outside the JSON structure.
The response must parse as valid JSON.

{{
  "patterns_detected": [
    {{
      "code": "PATTERN_CODE",
      "confidence": 0.0,
      "evidence": ["Trade #X: specific evidence"],
      "severity": "AUTO_REJECT"
    }}
  ],
  "recommendation": "APPROVE",
  "confidence": 0.0,
  "reasoning": "Clear explanation for risk manager",
  "risk_factors": {{
    "martingale_signature": false,
    "pyramid_signature": false,
    "grid_signature": false,
    "hedging_detected": false,
    "bot_signature": false,
    "copy_trading_signature": false,
    "news_trading_signature": false,
    "all_in_signature": false
  }},
  "key_findings": ["Summary bullet points"],
  "suggested_action": "Specific recommendation"
}}

CRITICAL RULES:
- Base decisions ONLY on evidence in the trade data
- Cite specific trade IDs (order numbers) when claiming patterns
- If confidence is 50-85%, recommend MANUAL_REVIEW
- If confidence >= 85% and pattern is AUTO_REJECT, recommend REJECT
- If no patterns or confidence < 50%, recommend APPROVE
- Learn from the training examples above - especially the corrections
- DO NOT evaluate consistency rules (daily limits, lot size) - already handled
- Focus EXCLUSIVELY on prohibited strategy detection

Prompt Version: {PROMPT_VERSION}
"""

    user_prompt = f"""
Analyze the following payout request for PROHIBITED TRADING STRATEGIES ONLY.

NOTE: Consistency checks have already passed. Do NOT re-evaluate consistency rules.
Focus ONLY on detecting prohibited/manipulative strategies listed in the knowledge base.

PAYOUT CONTEXT:
{json.dumps(context, indent=2)}

Instructions:
- Examine all trades for prohibited patterns
- Look for: martingale, grid, pyramid, hedging, copy trading, news trading, bot/EA
- Calculate confidence based on evidence strength
- Cite specific trade order numbers as evidence
- If no prohibited patterns detected, recommend APPROVE
- Return valid JSON matching the schema above
"""

    return {
        "prompt_version": PROMPT_VERSION,
        "training_examples_count": len(training_examples),
        "messages": [
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ],
    }
