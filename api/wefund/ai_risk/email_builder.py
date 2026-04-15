from django.template.loader import render_to_string
from .email_builder import VIOLATION_EMAIL_PHRASES

VIOLATION_EMAIL_PHRASES = {
    "MARTINGALE": (
        "Trading patterns inconsistent with responsible risk management practices"
    ),
    "GRID_TRADING": (
        "Systematic trading patterns that do not align with our manual trading requirements"
    ),
    "BOT_TRADING": (
        "Trading activity patterns inconsistent with manual trading requirements"
    ),
    "COPY_TRADING": (
        "Trading activity that appears synchronized with other accounts"
    ),
    "PYRAMID": (
        "Position sizing practices that exceed our risk management guidelines"
    ),
    "CONSISTENCY": (
        "Profit distribution that does not meet our consistency requirements"
    ),
}


def _build_example_trades(ai_analysis, max_examples=3):
    """
    Build safe, non-sensitive example trades for email display.
    """
    examples = []

    raw = ai_analysis.ai_raw_response or {}
    text = ai_analysis.ai_analysis_text or ""

    # Fallback: extract order references from AI text (very conservative)
    for line in text.splitlines():
        if "trade #" in line.lower() or "order" in line.lower():
            examples.append(line.strip())

        if len(examples) >= max_examples:
            break

    return examples


def build_payout_rejection_email(*, payout, ai_analysis):
    """
    Build compliant payout rejection email (text + HTML).
    """

    user = payout.trader
    enrollment = payout.challenge_enrollment
    challenge = enrollment.challenge

    account_id = enrollment.mt5_account_id

    # ------------------------------------------------
    # Determine Violation Phrase
    # ------------------------------------------------
    detected = ai_analysis.ai_patterns_detected or []
    primary_violation = detected[0] if detected else "CONSISTENCY"

    violation_phrase = VIOLATION_EMAIL_PHRASES.get(
        primary_violation,
        VIOLATION_EMAIL_PHRASES["CONSISTENCY"]
    )

    # ------------------------------------------------
    # Subject
    # ------------------------------------------------
    subject = (
        f"WeFund Payout Request Update - "
        f"{challenge.name} ({challenge.step_type}) "
        f"- Account #{account_id}"
    )

    # ------------------------------------------------
    # Plain Text Email (≤200 words)
    # ------------------------------------------------
    text_body = f"""
Dear {user.get_full_name() or "Trader"},

Thank you for your trading activity with WeFund. After a careful review of your
recent payout request for ${payout.amount:.2f} related to your
{challenge.name} ({challenge.step_type}) account, we regret to inform you that
we are unable to process this withdrawal at this time.

Our review identified {violation_phrase}, which falls outside the parameters
outlined in our Trading Guidelines.

Your funded account remains active and you may continue trading in accordance
with our rules. If you believe this decision was made in error, you may submit
an appeal within 14 days through your account portal.

Best regards,
WeFund Risk Team
""".strip()

    # ------------------------------------------------
    # Example Trades (Safe & Limited)
    # ------------------------------------------------
    example_trades = _build_example_trades(ai_analysis)

    # ------------------------------------------------
    # HTML Email Context
    # ------------------------------------------------
    html_context = {
        # Account / Challenge
        "CHALLENGE_NAME": challenge.name,
        "CHALLENGE_TYPE": challenge.step_type,
        "ACCOUNT_SIZE": f"{enrollment.account_size:,.2f}",
        "MT5_ACCOUNT": account_id,

        # Payout
        "TOTAL_CYCLE_PROFIT": f"{payout.profit:,.2f}",
        "PROFIT_SPLIT_PERCENT": payout.profit_share,
        "REQUESTED_PAYOUT": f"{payout.amount:,.2f}",

        # Violation
        "VIOLATION_REASON": violation_phrase,
        "PRIMARY_RULE": primary_violation,

        # Examples
        "EXAMPLE_TRADES": example_trades,
        "HAS_EXAMPLES": bool(example_trades),
    }

    html_body = render_to_string(
        "emails/automation/payouts/payout_rejected_v2.html",
        html_context,
    )

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
    }
