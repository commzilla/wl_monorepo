import json
import re
import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Max
import openai

from wefund.models import MT5Trade, TraderPayout
from wefund.models import (
    TraderPayoutComplianceAnalysis,
    ComplianceResponsibleTrade,
)

from django.conf import settings
openai.api_key = settings.OPENAI_API_KEY

def generate_compliance_analysis(payout_id: str):
    """
    Generate compliance analysis for a payout using AI checker.
    """
    try:
        payout = TraderPayout.objects.select_related(
            "trader", "challenge_enrollment"
        ).get(id=payout_id)
    except TraderPayout.DoesNotExist:
        raise ValueError(f"Payout {payout_id} not found")

    enrollment = payout.challenge_enrollment
    if not enrollment or not enrollment.mt5_account_id:
        raise ValueError(
            f"No MT5 account linked to the challenge enrollment for payout {payout_id}"
        )

    # Fetch trades since last payout
    last_payout_time = TraderPayout.objects.filter(
        trader=payout.trader,
        challenge_enrollment=enrollment,
        requested_at__lt=payout.requested_at,
    ).aggregate(last_time=Max("requested_at")).get("last_time")

    trades_qs = MT5Trade.objects.filter(account_id=enrollment.mt5_account_id)
    if last_payout_time:
        trades_qs = trades_qs.filter(close_time__gt=last_payout_time)

    trades_list = list(
        trades_qs.values(
            "order",       # MT5 ticket ID
            "symbol",
            "cmd",
            "volume",
            "profit",
            "open_time",
            "close_time",
            "margin_rate",  # correct field
        )
    )

    # Build AI prompt
    prompt = f"""
You are a trading compliance checker for WeFund.

Your job:
- Read the input (trades + context).
- Detect BOTH HARD and SOFT breaches.
- Identify any trades whose profits should be excluded or merged.
- Return ONLY the JSON described below, nothing else.

=============================
INPUT CONTEXT
=============================
Trader: {payout.trader.get_full_name()} ({payout.trader.email})
Challenge: {enrollment.challenge.name}
Account Size: {enrollment.account_size}
Current Balance: {enrollment.account_size + payout.profit}
Payout Profit: {payout.profit}
Requested Amount: {payout.amount}

Trades:
{trades_list}

=============================
EXPECTED OUTPUT SCHEMA
=============================
(As described in compliance prompt)
"""

    # Call OpenAI
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()

    # Clean JSON
    if content.startswith("```"):
        content = content.strip("```")
        if content.startswith("json"):
            content = content[4:].strip()

    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if json_match:
        content = json_match.group(0)

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise ValueError("AI returned invalid JSON compliance response")

    # Save results
    with transaction.atomic():
        analysis, _ = TraderPayoutComplianceAnalysis.objects.update_or_create(
            payout=payout,
            defaults={
                "version": data.get("version", "1.0"),
                "hard_breach_detected": data.get("hard_breach_detected", False),
                "soft_breach_detected": data.get("soft_breach_detected", False),
                "hard_breaches": data.get("hard_breaches", []),
                "soft_breaches": data.get("soft_breaches", []),
                "evidence": data.get("evidence", []),
                "metrics": data.get("metrics", {}),
                "payout_adjustments": data.get("payout_adjustments", {}),
                "updated_at": timezone.now(),
            },
        )

        # Replace trades
        analysis.responsible_trades.all().delete()
        for t in data.get("responsible_trades", []):
            ComplianceResponsibleTrade.objects.create(
                analysis=analysis,
                ticket_id=t.get("ticket_id") or t.get("order"),
                symbol=t.get("symbol"),
                direction=t.get("direction"),
                lot_size=Decimal(t.get("lot_size", 0)),
                open_time_utc=t.get("open_time_utc"),
                close_time_utc=t.get("close_time_utc"),
                pnl=Decimal(t.get("pnl", 0)),
                margin_at_open_pct=(
                    Decimal(t["margin_at_open_pct"])
                    if t.get("margin_at_open_pct") is not None
                    else None
                ),
                reason_flagged=t.get("reason_flagged", ""),
                breach_type=t.get("breach_type", ""),
            )

    return data

