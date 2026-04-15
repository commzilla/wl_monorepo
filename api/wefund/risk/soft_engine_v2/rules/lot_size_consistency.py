from wefund.models import MT5Trade

def run(enrollment, account_id=None, start_time=None, end_time=None):
    """
    Lot Size Consistency Rule:
    All trades must have lot sizes within:
    - Min: 30% of average lot
    - Max: 200% of average lot
    Returns a list of soft breach dicts for trades outside allowed range.
    """

    if not account_id or not start_time or not end_time:
        return []

    # Fetch trades for this account within payout period
    trades = MT5Trade.objects.filter(
        account_id=account_id,
        close_time__gte=start_time,
        close_time__lte=end_time
    ).order_by('close_time')

    if not trades.exists():
        return []

    # Compute average lot size across all trades
    lot_sizes = [float(trade.volume) for trade in trades]
    avg_lot = sum(lot_sizes) / len(lot_sizes)

    min_lot = avg_lot * 0.30
    max_lot = avg_lot * 2.00

    breaches = []

    for trade in trades:
        lot = float(trade.volume)
        if lot < min_lot or lot > max_lot:
            breaches.append({
                "rule": "lot_size_consistency",
                "value": lot,
                "description": (
                    f"Trade #{trade.order} lot size {lot:.2f} outside allowed range "
                    f"[{min_lot:.2f} - {max_lot:.2f}]. Profit excluded from payout."
                )
            })

    return breaches
