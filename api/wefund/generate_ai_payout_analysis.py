# wefund/generate_ai_payout_analysis.py
import re
import json
from decimal import Decimal
from django.utils import timezone
from django.db.models import Max
from wefund.models import TraderPayout, MT5Trade, TraderPayoutAIAnalysis
import openai

from django.conf import settings
openai.api_key = settings.OPENAI_API_KEY

def generate_ai_payout_analysis(payout_id: str):
    # 1️⃣ Fetch payout and enrollment
    try:
        payout = TraderPayout.objects.select_related(
            "trader", "challenge_enrollment"
        ).get(id=payout_id)
    except TraderPayout.DoesNotExist:
        raise ValueError(f"Payout {payout_id} not found")

    enrollment = payout.challenge_enrollment
    if not enrollment or not enrollment.mt5_account_id:
        raise ValueError(f"No MT5 account linked to the challenge enrollment for payout {payout_id}")

    # 2️⃣ Get trades since last payout
    last_payout_time = TraderPayout.objects.filter(
        trader=payout.trader,
        challenge_enrollment=enrollment,
        requested_at__lt=payout.requested_at
    ).aggregate(last_time=Max('requested_at')).get('last_time')

    trades_qs = MT5Trade.objects.filter(account_id=enrollment.mt5_account_id)
    if last_payout_time:
        trades_qs = trades_qs.filter(close_time__gt=last_payout_time)
    
    trades_list = list(trades_qs.values(
        'symbol', 'volume', 'cmd', 'profit',
        'open_price', 'close_price', 'open_time', 'close_time'
    ))

    # 3️⃣ Compute basic stats
    total_trades = len(trades_list)
    wins = [t for t in trades_list if t['profit'] > 0]
    losses = [t for t in trades_list if t['profit'] <= 0]
    win_rate = round(len(wins) / total_trades * 100, 2) if total_trades else 0
    avg_win = round(sum(t['profit'] for t in wins)/len(wins), 2) if wins else 0
    avg_loss = round(sum(t['profit'] for t in losses)/len(losses), 2) if losses else 0
    net_profit = float(payout.profit)

    # 4️⃣ AI prompt
    prompt = f"""
You are an expert trading analyst. Analyze the following trader and their trades, then generate a detailed AI trading review, summary, trading style, risk assessment, payout recommendation, and actionable AI recommendations. Also provide a risk score (0-100).

⚠️ Very important: In the summary, include a final decision about payout approval (Approved, Denied, or Partially Approved) with reasoning.

Trader Info:
Name: {payout.trader.get_full_name()}
Email: {payout.trader.email}
Challenge Type: {enrollment.challenge.name}
Account Size: {enrollment.account_size}
Current Balance: {enrollment.account_size + payout.profit}

Payout Info:
Profit: {payout.profit}
Net Profit: {payout.net_profit}
Requested Amount: {payout.amount}

Trading Stats:
Total Trades: {total_trades}
Win Rate: {win_rate}%
Average Win: {avg_win}
Average Loss: {avg_loss}
Net Profit: {net_profit}

Trades:
{trades_list}

Respond with ONLY a single valid JSON object containing the following keys:
- summary
- trading_style
- risk_assessment
- recommendation
- ai_trading_review
- ai_recommendations
- risk_score
"""

    # 5️⃣ Call OpenAI API
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1500
    )

    content = response.choices[0].message.content.strip()

    # 6️⃣ Clean markdown if present
    if content.startswith("```"):
        content = content.strip("```")
        if content.startswith("json"):
            content = content[4:].strip()

    # 7️⃣ Extract only first valid JSON block
    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if json_match:
        content = json_match.group(0)

    # 8️⃣ Parse JSON safely
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        data = {"ai_trading_review": content}

    # 9️⃣ Normalize for DB fields (match JSONField/TextField types)
    structured = {
        "ai_recommendations": data.get("ai_recommendations", []),
        "ai_trading_review": data.get("ai_trading_review", ""),
        "summary": data.get("summary", {}),
        "trading_style": data.get("trading_style", {}),
        "risk_assessment": data.get("risk_assessment", {}),
        "risk_score": Decimal(data.get("risk_score") or 0),
        "recommendation": data.get("recommendation", {}),
        "updated_at": timezone.now(),
    }

    # 🔟 Update or create DB record
    ai_analysis, _ = TraderPayoutAIAnalysis.objects.update_or_create(
        payout=payout,
        defaults=structured
    )

    return structured
