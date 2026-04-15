"""Slack webhook utility for sending formatted messages."""

import logging
import requests

logger = logging.getLogger(__name__)


def send_slack_message(webhook_url, blocks):
    """
    Post a message to Slack via incoming webhook.

    Args:
        webhook_url: Slack incoming webhook URL.
        blocks: List of Slack Block Kit block dicts.
    Returns:
        True on success, False on failure.
    """
    payload = {"blocks": blocks}
    try:
        resp = requests.post(webhook_url, json=payload, timeout=15)
        if resp.status_code != 200:
            logger.error("Slack webhook returned %s: %s", resp.status_code, resp.text)
            return False
        return True
    except requests.RequestException as exc:
        logger.exception("Slack webhook request failed: %s", exc)
        return False


def format_trading_report_blocks(report):
    """
    Build Slack Block Kit blocks from a TradingReport instance.
    Returns a list of block dicts.
    """
    period_label = report.get_period_type_display()
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Trading Report: {period_label} ({report.period_start} – {report.period_end})",
            },
        },
        {"type": "divider"},
    ]

    METRIC_EMOJIS = {
        "highest_payout": ":moneybag:",
        "best_trade": ":chart_with_upwards_trend:",
        "best_roi": ":dart:",
        "most_profitable_trader": ":trophy:",
        "most_active_trader": ":zap:",
        "fastest_phase_completion": ":rocket:",
        "most_traded_pairs": ":chart_with_downwards_trend:",
        "quickest_2step": ":stopwatch:",
        "fastest_to_payout": ":money_with_wings:",
    }

    def _fmt_duration(minutes):
        total = round(float(minutes))
        if total < 60:
            return f"{total}m"
        if total < 1440:
            h, m = divmod(total, 60)
            return f"{h}h {m}m" if m > 0 else f"{h}h"
        d, remainder = divmod(total, 1440)
        h = remainder // 60
        return f"{d}d {h}h" if h > 0 else f"{d}d"

    VALUE_FORMATS = {
        "highest_payout": lambda v: f"${v:,.2f}",
        "best_trade": lambda v: f"${v:,.2f}",
        "best_roi": lambda v: f"{v:.2f}%",
        "most_profitable_trader": lambda v: f"${v:,.2f}",
        "most_active_trader": lambda v: f"{int(v)} trades",
        "fastest_phase_completion": lambda v: _fmt_duration(v),
        "most_traded_pairs": lambda v: f"{int(v)} trades",
        "quickest_2step": lambda v: _fmt_duration(v),
        "fastest_to_payout": lambda v: _fmt_duration(v),
    }

    for metric in report.data.get("metrics", []):
        name = metric["metric_name"]
        emoji = METRIC_EMOJIS.get(name, ":bar_chart:")
        fmt = VALUE_FORMATS.get(name, lambda v: str(v))

        entries = metric.get("entries", [])
        if not entries:
            continue

        lines = [f"{emoji} *{metric['metric_label']}*"]
        for entry in entries[:5]:
            rank = entry["rank"]
            medal = {1: ":first_place_medal:", 2: ":second_place_medal:", 3: ":third_place_medal:"}.get(rank, f"#{rank}")
            lines.append(f"  {medal} {entry['trader_username']} — {fmt(entry['value'])}")

        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n".join(lines)},
        })

    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": f"Generated at {report.generated_at.strftime('%Y-%m-%d %H:%M UTC')}"}],
    })

    return blocks
