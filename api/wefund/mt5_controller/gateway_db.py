"""
Direct PostgreSQL queries against the MT5 Gateway client database.

Replaces all MySQL queries from utils.py. Data comes from the gateway's
real-time sync (positions: 0.5s, deals/orders: 1s, users: 30s).
"""
import logging
from decimal import Decimal
from typing import Optional

from django.db import connections

logger = logging.getLogger(__name__)

GATEWAY_DB_ALIAS = 'mt5_gateway'


def _dictfetchall(cursor):
    """Return all rows from a cursor as a list of dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _dictfetchone(cursor):
    """Return one row from a cursor as a dict, or None."""
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None


def _get_cursor():
    """Get a database cursor for the gateway client DB."""
    return connections[GATEWAY_DB_ALIAS].cursor()


# ── User / Balance / Equity ────────────────────────────────────────────

def get_user_balance(login: int) -> Optional[Decimal]:
    """Fetch balance + credit for a user. Returns Decimal or None."""
    try:
        with _get_cursor() as cursor:
            cursor.execute(
                "SELECT balance + COALESCE(credit, 0) FROM mt5_users WHERE login = %s",
                [login],
            )
            row = cursor.fetchone()
            return Decimal(str(row[0])) if row else None
    except Exception:
        logger.warning(f"Gateway DB: cannot fetch balance for {login}")
        return None


def get_user_equity(login: int) -> Optional[Decimal]:
    """Fetch equity for a user. Returns Decimal or None."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("SELECT equity FROM mt5_users WHERE login = %s", [login])
            row = cursor.fetchone()
            return Decimal(str(row[0])) if row else None
    except Exception:
        logger.warning(f"Gateway DB: cannot fetch equity for {login}")
        return None


def get_user_balance_and_equity(login: int) -> tuple:
    """Fetch both balance+credit and equity in one query. Returns (Decimal|None, Decimal|None)."""
    try:
        with _get_cursor() as cursor:
            cursor.execute(
                "SELECT balance + COALESCE(credit, 0), equity FROM mt5_users WHERE login = %s",
                [login],
            )
            row = cursor.fetchone()
            if row:
                return (Decimal(str(row[0])), Decimal(str(row[1])))
            return (None, None)
    except Exception:
        logger.warning(f"Gateway DB: cannot fetch balance/equity for {login}")
        return (None, None)


def get_user_by_login(login: int) -> Optional[dict]:
    """Fetch full user record."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("SELECT * FROM mt5_users WHERE login = %s", [login])
            return _dictfetchone(cursor)
    except Exception:
        logger.warning(f"Gateway DB: cannot fetch user {login}")
        return None


# ── Positions ──────────────────────────────────────────────────────────

def get_user_open_positions(login: int, limit: int = 200) -> list:
    """Fetch open positions for a user, normalized for business logic."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("""
                SELECT ticket, login, symbol, type AS action, volume,
                       price_open, price_current, price_sl, price_tp,
                       profit, swap AS storage, commission,
                       time_create, time_update, comment, external_id
                FROM mt5_positions
                WHERE login = %s
                ORDER BY time_create DESC
                LIMIT %s
            """, [login, limit])
            rows = _dictfetchall(cursor)

        positions = []
        for r in rows:
            lots = Decimal(str(r['volume'])) / Decimal('10000') if r['volume'] > 100 else Decimal(str(r['volume']))
            positions.append({
                'position_id': r['ticket'],
                'symbol': r['symbol'],
                'side': 'BUY' if r['action'] == 0 else 'SELL',
                'lots': float(lots),
                'open_price': float(r['price_open']),
                'current_price': float(r['price_current']),
                'sl': float(r['price_sl']) if r['price_sl'] else None,
                'tp': float(r['price_tp']) if r['price_tp'] else None,
                'floating_pnl': float(Decimal(str(r['profit'])) + Decimal(str(r['storage']))),
                'opened_at': r['time_create'],
                'updated_at': r['time_update'],
            })
        return positions
    except Exception:
        logger.exception(f"Gateway DB: cannot fetch positions for {login}")
        return []


def get_all_open_positions(limit: int = 5000) -> list:
    """Fetch all open positions across all logins (for SL tracking etc)."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("""
                SELECT ticket, login, symbol, type AS action, volume,
                       price_open, price_current, price_sl, price_tp,
                       profit, swap AS storage, commission,
                       time_create, time_update, comment, external_id
                FROM mt5_positions
                ORDER BY time_update DESC
                LIMIT %s
            """, [limit])
            return _dictfetchall(cursor)
    except Exception:
        logger.exception("Gateway DB: cannot fetch all positions")
        return []


def normalize_position_row(r: dict) -> dict:
    """Normalize a raw position row for business logic (matches old format)."""
    volume_raw = Decimal(str(r.get('volume', 0)))
    lots = volume_raw / Decimal('10000') if volume_raw > 100 else volume_raw
    return {
        'position_id': r['ticket'],
        'login': r['login'],
        'symbol': r['symbol'],
        'side': 'BUY' if r['action'] == 0 else 'SELL',
        'lots': lots,
        'digits': 5,
        'open_price': Decimal(str(r['price_open'])),
        'current_price': Decimal(str(r['price_current'])),
        'sl': Decimal(str(r['price_sl'])) if r['price_sl'] is not None else Decimal('0'),
        'tp': Decimal(str(r['price_tp'])) if r['price_tp'] is not None else Decimal('0'),
        'profit': Decimal(str(r['profit'])),
        'storage': Decimal(str(r['storage'])),
        'changed_at': r.get('time_update'),
        'changed_at_ts': int(r['time_update'].timestamp()) if r.get('time_update') else 0,
        'dealer': 0,
        'expert_id': Decimal('0'),
        'comment': r.get('comment', ''),
    }


# ── Deals ──────────────────────────────────────────────────────────────

def get_user_deals(login: int, action_filter: bool = True, limit: int = 500) -> list:
    """Fetch deals for a user."""
    try:
        with _get_cursor() as cursor:
            if action_filter:
                cursor.execute("""
                    SELECT * FROM mt5_deals
                    WHERE login = %s AND action BETWEEN 0 AND 1
                    ORDER BY time DESC
                    LIMIT %s
                """, [login, limit])
            else:
                cursor.execute("""
                    SELECT * FROM mt5_deals
                    WHERE login = %s
                    ORDER BY time DESC
                    LIMIT %s
                """, [login, limit])
            return _dictfetchall(cursor)
    except Exception:
        logger.exception(f"Gateway DB: cannot fetch deals for {login}")
        return []


# ── Trade Legs (pre-computed open/close pairs) ─────────────────────────

def get_closed_trade_legs(login: int, limit: int = 500) -> list:
    """
    Fetch closed trade legs (pre-computed open/close pairs).
    Replaces the old fetch_user_closed_trades() which did client-side pairing.
    """
    try:
        with _get_cursor() as cursor:
            cursor.execute("""
                SELECT id, login, position_id, symbol, direction,
                       open_deal_ticket, open_time, open_price, open_volume,
                       close_deal_ticket, close_time, close_price, close_volume,
                       profit, commission, swap, total_profit,
                       is_closed, duration_seconds
                FROM trade_legs
                WHERE login = %s AND is_closed = true
                ORDER BY close_time DESC
                LIMIT %s
            """, [login, limit])
            rows = _dictfetchall(cursor)

        # Map to format compatible with old fetch_user_closed_trades output
        trades = []
        for r in rows:
            trades.append({
                'position_id': r['position_id'],
                'symbol': r['symbol'],
                'side': r['direction'],
                'open_time': r['open_time'],
                'open_price': r['open_price'],
                'close_time': r['close_time'],
                'close_price': r['close_price'],
                'volume': float(r['close_volume'] or r['open_volume']),
                'open_volume': float(r['open_volume']),
                'closed_volume': float(r['close_volume'] or 0),
                'profit': float(r['profit']),
                'commission': float(r['commission']),
                'swap': float(r['swap']),
                'sl': None,
                'tp': None,
                'is_closed': r['is_closed'],
                'duration_seconds': r['duration_seconds'],
            })
        return trades
    except Exception:
        logger.exception(f"Gateway DB: cannot fetch trade legs for {login}")
        return []


# ── IP / Fraud Analysis ───────────────────────────────────────────────

def get_ip_summary(limit: int = 50) -> list:
    """Fetch distinct IP addresses with account counts."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("""
                SELECT last_ip AS ip, COUNT(*) AS accounts_count
                FROM mt5_users
                WHERE last_ip IS NOT NULL
                GROUP BY last_ip
                ORDER BY accounts_count DESC
                LIMIT %s
            """, [limit])
            return _dictfetchall(cursor)
    except Exception:
        logger.exception("Gateway DB: cannot fetch IP summary")
        return []


def get_accounts_by_ip(ip_address: str) -> list:
    """Fetch all accounts for a given IP address."""
    try:
        with _get_cursor() as cursor:
            cursor.execute("""
                SELECT login, name, email, phone,
                       "group", balance, last_ip,
                       city, country, registration_time AS created
                FROM mt5_users
                WHERE last_ip = %s
                ORDER BY registration_time DESC
            """, [ip_address])
            return _dictfetchall(cursor)
    except Exception:
        logger.exception(f"Gateway DB: cannot fetch accounts for IP {ip_address}")
        return []
