"""
Journal AI Context Builder + Gemini Integration.
Provides AI-powered insights for the Trade Journal feature.
"""
import json
import logging
from wefund.ai_risk.gemini_client import get_gemini_risk_client, GeminiRiskClientError

logger = logging.getLogger(__name__)


def _call_gemini(system_prompt, context, model_name="gemini-2.5-flash"):
    """Call Gemini and return parsed JSON response."""
    try:
        client = get_gemini_risk_client()
        result = client.analyze_payout(
            system_instruction=system_prompt,
            trade_context=json.dumps(context) if isinstance(context, dict) else context,
            model_name=model_name,
            temperature=0.4,
            max_tokens=4096,
        )
        return json.loads(result['text'])
    except (GeminiRiskClientError, json.JSONDecodeError) as e:
        logger.error(f"Gemini call failed: {e}")
        raise


def generate_daily_summary(trade_data, total_pnl, win_rate, date_str):
    """Generate AI daily performance summary."""
    system_prompt = """You are an expert trading coach analyzing a trader's daily performance.
Analyze the provided trades and return a JSON object with these exact keys:
- summary: A 2-3 sentence overview of the day's trading
- strength: The best aspect of today's trading (1 sentence)
- improvement: One specific area to improve (1 sentence)
- actionable_tip: A concrete, actionable tip for tomorrow (1 sentence)
- risk_alert: Any risk concern, or empty string if none

Be encouraging but honest. Use specific numbers from the data."""

    context = {
        'date': date_str,
        'total_pnl': total_pnl,
        'win_rate': win_rate,
        'trade_count': len(trade_data),
        'trades': trade_data,
    }

    try:
        return _call_gemini(system_prompt, context, "gemini-2.5-flash-lite")
    except Exception:
        return {
            'summary': f'Today you took {len(trade_data)} trades with ${total_pnl:.2f} net P&L and {win_rate:.0f}% win rate.',
            'strength': 'Active trading day.' if len(trade_data) > 3 else 'Selective approach.',
            'improvement': 'Review your losing trades for recurring patterns.',
            'actionable_tip': 'Focus on your highest probability setups tomorrow.',
            'risk_alert': '' if total_pnl >= 0 else 'Net loss day - review position sizing.',
        }


def answer_journal_question(question, trade_summary, trades):
    """Answer a natural language question about trading performance."""
    system_prompt = """You are an expert trading analyst assistant. Answer the trader's question
using ONLY the data provided. Be specific with numbers. Reference actual trades when relevant.
Be encouraging but honest. Keep your answer under 300 words.
Return a JSON object with key 'answer' containing your response as a string."""

    context = {
        'question': question,
        'summary': trade_summary,
        'recent_trades': trades,
    }

    try:
        result = _call_gemini(system_prompt, context)
        return result.get('answer', str(result))
    except Exception:
        return "I'm unable to process your question right now. Please try again later."


def generate_period_report(period, start, end, total_trades, win_rate, net_pnl, best_day, worst_day):
    """Generate weekly/monthly AI report."""
    system_prompt = f"""You are an expert trading coach generating a {period} performance report.
Return a JSON object with these keys:
- executive_summary: 3-4 sentence overview
- best_day: Analysis of the best trading day
- worst_day: Analysis of the worst trading day
- top_pattern: Most notable trading pattern observed
- psychology_insight: Behavioral observation
- rule_compliance_grade: A letter grade (A-F) for discipline
- goals_for_next_week: 2-3 specific goals

Be data-driven and constructive."""

    context = {
        'period': period,
        'start': start,
        'end': end,
        'total_trades': total_trades,
        'win_rate': win_rate,
        'net_pnl': net_pnl,
        'best_day': best_day,
        'worst_day': worst_day,
    }

    try:
        return _call_gemini(system_prompt, context)
    except Exception:
        return {
            'executive_summary': f'This {period}: {total_trades} trades, ${net_pnl:.2f} net P&L, {win_rate:.0f}% win rate.',
            'best_day': best_day or 'N/A',
            'worst_day': worst_day or 'N/A',
            'top_pattern': 'Insufficient data for pattern analysis.',
            'psychology_insight': 'Continue maintaining your trading journal for better insights.',
            'rule_compliance_grade': 'N/A',
            'goals_for_next_week': ['Review losing trades', 'Maintain journal consistency'],
            'period': {'start': start, 'end': end},
        }


def detect_patterns(trades):
    """Detect recurring trading patterns using AI."""
    system_prompt = """You are an expert trading pattern analyst. Analyze the provided trades
and identify recurring patterns. Return a JSON object with:
- profitable_patterns: Array of {pattern, description, frequency, avg_profit}
- losing_patterns: Array of {pattern, description, frequency, avg_loss}
- behavioral_patterns: Array of {pattern, description, impact}
- suggestions: Array of actionable improvement suggestions (strings)

Focus on actionable insights. Be specific about symbols, times, and patterns."""

    context = {'trades': trades}

    try:
        return _call_gemini(system_prompt, context)
    except Exception:
        return {
            'profitable_patterns': [],
            'losing_patterns': [],
            'behavioral_patterns': [],
            'suggestions': ['AI pattern detection is temporarily unavailable.'],
        }


def simulate_what_if(question, total_trades, win_rate, net_pnl, starting_balance):
    """Simulate a what-if trading scenario."""
    system_prompt = """You are a trading performance simulator. Given the trader's historical
stats and their hypothetical scenario, model the outcome. Return JSON with:
- projected_pnl: Estimated P&L under the scenario
- projected_win_rate: Estimated win rate
- risk_assessment: Risk analysis of the scenario (2-3 sentences)
- recommendation: Your recommendation (1-2 sentences)

Be realistic and data-driven."""

    context = {
        'question': question,
        'current_stats': {
            'total_trades': total_trades,
            'win_rate': win_rate,
            'net_pnl': net_pnl,
            'starting_balance': starting_balance,
        }
    }

    try:
        return _call_gemini(system_prompt, context)
    except Exception:
        return {
            'projected_pnl': net_pnl,
            'projected_win_rate': win_rate,
            'risk_assessment': 'Unable to simulate at this time.',
            'recommendation': 'Try again later.',
        }
