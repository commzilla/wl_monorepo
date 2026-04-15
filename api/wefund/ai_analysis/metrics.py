# metrics.py
from datetime import datetime


def compute_stats_and_samples(trades_qs, start_dt, end_dt):
    trades = list(trades_qs)
    total = len(trades)

    if total == 0:
        return {
            "stats": {"total_trades": 0},
            "samples": {
                "period_start": start_dt.isoformat(),
                "period_end": end_dt.isoformat(),
                "trades": []
            }
        }

    gross_profit = sum(float(t.profit) for t in trades if t.profit > 0)
    gross_loss = sum(float(t.profit) for t in trades if t.profit < 0)
    net_profit = gross_profit + gross_loss

    wins = [t for t in trades if t.profit > 0]
    win_rate = len(wins) / total

    symbol_counts = {}
    for t in trades:
        symbol_counts[t.symbol] = symbol_counts.get(t.symbol, 0) + 1
    symbol_exposure = {s: c / total for s, c in symbol_counts.items()}

    samples = []
    for t in trades:
        samples.append({
            "ticket": t.order,
            "symbol": t.symbol,
            "cmd": "buy" if t.cmd == 0 else "sell",
            "volume": float(t.volume),
            "pnl": float(t.profit),
            "open_time": t.open_time.isoformat(),
            "close_time": t.close_time.isoformat(),
        })

    return {
        "stats": {
            "total_trades": total,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss,
            "net_profit": net_profit,
            "win_rate": win_rate,
            "symbol_exposure": symbol_exposure,
        },
        "samples": {
            "period_start": start_dt.isoformat(),
            "period_end": end_dt.isoformat(),
            "trades": samples[:300]
        }
    }
