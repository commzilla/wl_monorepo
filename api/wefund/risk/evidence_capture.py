from decimal import Decimal
from datetime import datetime as py_datetime, timezone as py_timezone
import logging

from django.utils import timezone
from django.conf import settings

from wefund.models import BreachEvidence, BreachEvidencePosition
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity
from api.services.mt5_client import MT5Client
from api.utils.time import now_gmt2_naive

logger = logging.getLogger(__name__)


def _ts_to_aware_dt(ts):
    if not ts:
        return None
    try:
        return py_datetime.fromtimestamp(int(ts), tz=py_timezone.utc)
    except Exception:
        return None


def _normalize_open_trade(p: dict) -> dict:
    cmd = p.get("cmd")
    side = "buy" if cmd == 0 else "sell" if cmd == 1 else str(cmd)

    return {
        "ticket": int(p.get("order") or 0),
        "symbol": (p.get("symbol") or "").strip(),
        "side": side,
        "volume": Decimal(str(p.get("volume") or "0")),
        "open_price": Decimal(str(p.get("open_price"))) if p.get("open_price") is not None else None,
        "current_price": Decimal(str(p.get("current_price"))) if p.get("current_price") is not None else None,
        "sl": Decimal(str(p.get("sl"))) if p.get("sl") is not None else None,
        "tp": Decimal(str(p.get("tp"))) if p.get("tp") is not None else None,
        "profit": Decimal(str(p.get("profit"))) if p.get("profit") is not None else None,
        "commission": Decimal(str(p.get("commission"))) if p.get("commission") is not None else None,
        "swap": Decimal(str(p.get("storage"))) if p.get("storage") is not None else None,
        "magic": int(p.get("magic") or 0),
        "comment": p.get("comment") or "",
        "opened_at": _ts_to_aware_dt(p.get("open_time") or p.get("timestamp")),
    }


def capture_breach_evidence(
    *,
    breach,
    enrollment,
    rule: str,
    reason: str,
    context: dict | None = None,
):
    """
    Creates BreachEvidence + BreachEvidencePosition rows.

    - NEVER raises (we handle exceptions inside)
    - Uses existing helpers ONLY (no changes to shared helpers)
    - Captures open positions BEFORE you close trades/disable trading
    """
    context = context or {}
    account_id = enrollment.mt5_account_id

    try:
        balance = None
        equity = None

        if account_id:
            try:
                balance = fetch_user_balance(account_id)
            except Exception as e:
                logger.warning(f"[EVIDENCE] Balance fetch failed for {account_id}: {e}")

            try:
                equity = fetch_user_equity(account_id)
            except Exception as e:
                logger.warning(f"[EVIDENCE] Equity fetch failed for {account_id}: {e}")

        # If rule provided equity used for decision, prefer it
        if context.get("equity_used") is not None:
            try:
                equity = Decimal(str(context["equity_used"]))
            except Exception:
                pass

        open_positions_raw = []
        if account_id:
            try:
                mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
                open_positions_raw = mt5.get_open_trades(account_id) or []
            except Exception as e:
                logger.exception(f"[EVIDENCE] Open trades fetch failed for {account_id}: {e}")
                open_positions_raw = []

        evidence = BreachEvidence.objects.create(
            breach=breach,
            enrollment=enrollment,
            account_id=account_id,
            captured_at=timezone.now(),     # aware UTC
            broker_time=now_gmt2_naive(),   # your existing broker naive time
            equity=equity,
            balance=balance,
            start_balance=context.get("start_balance"),
            threshold=context.get("threshold"),
            max_loss_amount=context.get("max_loss_amount"),
            max_loss_percent=context.get("max_loss_percent"),
            equity_payload={
                "source": "mysql_replication",
                "equity": str(equity) if equity is not None else None,
                "balance": str(balance) if balance is not None else None,
            },
            positions_payload=open_positions_raw,
            positions_count=len(open_positions_raw),
        )

        rows = []
        for p in open_positions_raw:
            n = _normalize_open_trade(p)
            if not n["ticket"]:
                continue

            rows.append(
                BreachEvidencePosition(
                    evidence=evidence,
                    ticket=n["ticket"],
                    symbol=n["symbol"][:32],
                    side=n["side"][:8],
                    volume=n["volume"],
                    open_price=n["open_price"],
                    current_price=n["current_price"],
                    sl=n["sl"],
                    tp=n["tp"],
                    profit=n["profit"],
                    swap=n["swap"],
                    commission=n["commission"],
                    opened_at=n["opened_at"],
                    magic=n["magic"],
                    comment=n["comment"][:255],
                )
            )

        if rows:
            BreachEvidencePosition.objects.bulk_create(rows)

        return evidence

    except Exception as e:
        logger.exception(f"[EVIDENCE] Failed to capture breach evidence (breach={getattr(breach, 'id', None)}): {e}")
        return None
