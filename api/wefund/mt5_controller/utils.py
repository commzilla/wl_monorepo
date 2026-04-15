import os
import time
import mysql.connector
from mysql.connector import Error
import logging
import datetime
from contextlib import contextmanager
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal


logger = logging.getLogger(__name__)

# Remote MySQL connection settings (MT5 replication DB)
MYSQL_CONFIG = {
    "host": os.getenv("MT5_MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MT5_MYSQL_PORT", 3306)),
    "user": os.getenv("MT5_MYSQL_USER", "root"),
    "password": os.getenv("MT5_MYSQL_PASSWORD", ""),
    "database": os.getenv("MT5_MYSQL_DATABASE", ""),
    "autocommit": os.getenv("MT5_MYSQL_AUTOCOMMIT", "True").lower() in ("true", "1", "yes"),
    "connection_timeout": int(os.getenv("MT5_MYSQL_TIMEOUT", 3)),
}

# Circuit breaker: skip MySQL attempts for 60s after a failure
_mysql_circuit = {"open": False, "failed_at": 0.0}
_CIRCUIT_COOLDOWN = 60  # seconds

@contextmanager
def get_mysql_connection():
    """
    Context manager to get a connection to the remote MT5 MySQL database.
    This does NOT affect Django's primary PostgreSQL connection.
    Includes a circuit breaker to avoid hammering an unavailable server.
    """
    if _mysql_circuit["open"] and (time.monotonic() - _mysql_circuit["failed_at"]) < _CIRCUIT_COOLDOWN:
        raise ConnectionError("MT5 MySQL circuit breaker open – skipping connection attempt")

    conn = None
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        _mysql_circuit["open"] = False  # reset on success
        yield conn
    except Error as e:
        _mysql_circuit["open"] = True
        _mysql_circuit["failed_at"] = time.monotonic()
        logger.error(f"MySQL connection error: {e}")
        raise
    finally:
        if conn and conn.is_connected():
            conn.close()

def fetch_user_by_id(user_id):
    """
    Fetch a single user by login ID from MT5 MySQL DB with all available columns.
    """
    query = "SELECT * FROM users WHERE login = %s"
    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
    return result

def fetch_user_balance(user_id):
    """
    Fetch the balance for a given login ID from MT5 MySQL DB.
    Returns None if the connection fails or user not found.
    """
    try:
        query = "SELECT balance FROM users WHERE login = %s"
        with get_mysql_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (user_id,))
            result = cursor.fetchone()
        if result and result["balance"] is not None:
            return Decimal(str(result["balance"]))
    except Exception:
        logger.warning(f"MT5 MySQL unavailable – cannot fetch balance for {user_id}")
    return None


def fetch_user_equity(user_id):
    """
    Fetch the equity for a given login ID from MT5 MySQL DB.
    Returns None if the connection fails or user not found.
    """
    try:
        query = "SELECT equity FROM mt5_accounts_margin WHERE login = %s"
        with get_mysql_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (user_id,))
            result = cursor.fetchone()
        if result and result["equity"] is not None:
            return Decimal(str(result["equity"]))
    except Exception:
        logger.warning(f"MT5 MySQL unavailable – cannot fetch equity for {user_id}")
    return None


def fetch_all_equities(account_ids):
    """
    Batch-fetch equities for multiple accounts in a single MySQL query.
    Returns dict of {account_id: Decimal(equity)} for all found accounts.
    """
    if not account_ids:
        return {}
    try:
        placeholders = ",".join(["%s"] * len(account_ids))
        query = f"SELECT login, equity FROM mt5_accounts_margin WHERE login IN ({placeholders})"
        with get_mysql_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, list(account_ids))
            rows = cursor.fetchall()
        return {
            row["login"]: Decimal(str(row["equity"]))
            for row in rows
            if row["equity"] is not None
        }
    except Exception:
        logger.warning("MT5 MySQL unavailable – batch equity fetch failed")
        return {}


def fetch_all_groups(limit=99):
    """
    Fetch groups from MT5 MySQL DB for inspection.
    """
    query = f"SELECT * FROM groups LIMIT {limit}"
    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        result = cursor.fetchall()
    return result

def fetch_latest_equity(user_id):
    """
    Fetch the latest equity snapshot for a single user from MT5_USERS_EQUITY_PNL.
    Returns a dictionary with highest and lowest equity and timestamp.
    """
    query = """
        SELECT EQUITY_HIGHEST AS highest_equity,
               EQUITY_LOWEST AS lowest_equity,
               TIMESTAMP
        FROM MT5_USERS_EQUITY_PNL
        WHERE LOGIN = %s
        ORDER BY TIMESTAMP DESC
        LIMIT 1
    """
    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()

    # Convert TIMESTAMP to datetime
    if result and "TIMESTAMP" in result and isinstance(result["TIMESTAMP"], (int, float)):
        result["timestamp"] = datetime.datetime.fromtimestamp(result.pop("TIMESTAMP"))

    return result



ACTION_MAP = {
    0: "BUY",
    1: "SELL",
    2: "BALANCE",
    3: "CREDIT",
    4: "CHARGE",
    5: "CORRECTION",
    6: "BONUS",
    7: "COMMISSION",
    8: "COMMISSION_DAILY",
    9: "COMMISSION_MONTHLY",
    10: "AGENT",
    11: "INTEREST",
    12: "BUY_CANCELED",
    13: "SELL_CANCELED",
}

ENTRY_MAP = {
    0: "IN",      # Opening deal
    1: "OUT",     # Closing deal
    2: "INOUT",   # Closed by opposite deal
    3: "OUT_BY",  # Closed by another order
}

def fetch_user_orders(user_login, status="all"):
    """
    Fetch orders for a given user from the `orders` table in MT5 DB.

    Args:
        user_login (int): MT5 user login ID.
        status (str): 'all', 'active', or 'closed'.
                      'active' = state indicates pending and time_done = 0
                      'closed' = time_done > 0

    Returns:
        List[Dict]: List of orders with all available columns.
    """
    base_query = "SELECT * FROM orders WHERE login = %s"
    params = [user_login]

    if status == "active":
        base_query += " AND time_done = 0"
    elif status == "closed":
        base_query += " AND time_done > 0"

    base_query += " ORDER BY time_setup DESC LIMIT 200"

    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(base_query, params)
        orders = cursor.fetchall()

    # Convert bigint timestamps to datetime for readability
    ts_fields = ["timestamp", "time_setup", "time_expiration", "time_done", "modify_time"]
    for order in orders:
        for ts_field in ts_fields:
            if ts_field in order and isinstance(order[ts_field], int) and order[ts_field] > 0:
                # MySQL stores epoch in seconds
                order[ts_field] = datetime.datetime.fromtimestamp(order[ts_field])

    return orders



def fetch_user_deals(user_login, action_filter=True):
    """
    Fetch executed deals (trades) for a given user from MT5 DB.

    Args:
        user_login (int): MT5 user login ID.
        action_filter (bool): If True, only return buy/sell deals (action 0 or 1).

    Returns:
        List[Dict]: List of deals with all columns.
    """
    base_query = "SELECT * FROM deals WHERE login = %s"
    params = [user_login]

    if action_filter:
        base_query += " AND action BETWEEN 0 AND 1"

    base_query += " ORDER BY time DESC"

    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(base_query, params)
        deals = cursor.fetchall()

    # Convert timestamp fields (ms → sec if needed)
    ts_fields = ["time", "time_msc", "modify_time"]
    for deal in deals:
        for ts_field in ts_fields:
            if ts_field in deal and isinstance(deal[ts_field], int) and deal[ts_field] > 0:
                ts_val = deal[ts_field]
                # Detect ms vs sec
                if ts_val > 1e12:  # definitely ms
                    ts_val = ts_val / 1000.0
                deal[ts_field] = datetime.fromtimestamp(ts_val)

    return deals

def fetch_user_closed_trades(user_login, limit=500):
    deals = fetch_user_deals(user_login, action_filter=True)

    trades = {}
    for d in deals:
        pos_id = d.get("position_id")
        if not pos_id:
            continue

        if pos_id not in trades:
            trades[pos_id] = {
                "position_id": pos_id,
                "symbol": d["symbol"],
                "open_volume": 0.0,
                "closed_volume": 0.0,
                "open_time": None,
                "open_price": None,
                "close_time": None,
                "close_price": None,
                "profit": 0.0,
                "commission": 0.0,
                "sl": None,
                "tp": None,
                "side": None,
            }

        trade = trades[pos_id]

        if d["entry"] == 0:  # IN (OPEN)
            if trade["open_time"] is None:
                trade["open_time"] = d["time"]
                trade["open_price"] = d["price"]
                trade["side"] = "BUY" if d["action"] == 0 else "SELL"

            trade["open_volume"] += d["volume"] / 10000.0
            trade["commission"] += d.get("commission", 0.0)

            # Capture SL/TP at open
            trade["sl"] = d.get("priceSL") or trade["sl"]
            trade["tp"] = d.get("priceTP") or trade["tp"]

        elif d["entry"] == 1:  # OUT (CLOSE)
            trade["close_time"] = d["time"]
            trade["close_price"] = d["price"]

            trade["profit"] += d.get("profit", 0.0)
            trade["commission"] += d.get("commission", 0.0)

            if "volume_closed" in d:
                trade["closed_volume"] += d["volume_closed"] / 10000.0
            else:
                trade["closed_volume"] += d["volume"] / 10000.0

            # ✅ Always update SL/TP from latest deal snapshot
            trade["sl"] = d.get("priceSL") or trade["sl"]
            trade["tp"] = d.get("priceTP") or trade["tp"]

    # Finalize: keep only closed trades, expose closed_volume as 'volume'
    closed = []
    for t in trades.values():
        if t["close_time"]:
            t["volume"] = t["closed_volume"] or t["open_volume"]
            t["is_closed"] = t["closed_volume"] >= t["open_volume"]
            closed.append(t)

    closed.sort(key=lambda x: x["close_time"], reverse=True)
    return closed[:limit]


def fetch_user_closed_deals(user_login, limit=200):
    """
    Fetch only closed deals (exit trades) for a given user.
    """
    query = """
        SELECT * FROM deals 
        WHERE login = %s 
          AND action BETWEEN 0 AND 1   -- Only Buy/Sell
          AND entry = 1                -- Exit trades
          AND volume_closed > 0
        ORDER BY time DESC
        LIMIT %s
    """

    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (user_login, limit))
        deals = cursor.fetchall()

    ts_fields = ["time", "time_msc", "modify_time"]
    for deal in deals:
        # Convert timestamps safely -> always UTC aware
        for ts_field in ts_fields:
            if ts_field in deal and isinstance(deal[ts_field], int) and deal[ts_field] > 0:
                ts_val = deal[ts_field]
                if ts_val > 1e12:  # milliseconds
                    ts_val /= 1000.0
                deal[ts_field] = datetime.fromtimestamp(ts_val, tz=dt_timezone.utc)

        # Map action/entry codes
        deal["action_text"] = ACTION_MAP.get(deal["action"], f"UNKNOWN({deal['action']})")
        deal["entry_text"] = ENTRY_MAP.get(deal["entry"], f"UNKNOWN({deal['entry']})")

    return deals

def fetch_user_full_trades(user_login, limit=500):
    """
    Fetch all deals for a user and reconstruct fully closed trades
    with open/close price, times, direction, volume in lots, 
    total commission, profit, and swap.
    """
    deals = fetch_user_orders(user_login, status="all")  # raw deals
    trades = {}

    for d in deals:
        pos_id = d.get("position_id")
        if not pos_id:
            continue

        if pos_id not in trades:
            trades[pos_id] = {
                "symbol": d.get("symbol"),
                "volume": d.get("volume", 0) / 100,  # MT5 lots
                "direction": None,
                "open_time": None,
                "open_price": None,
                "close_time": None,
                "close_price": None,
                "profit": 0.0,
                "commission": 0.0,
                "swap": 0.0,
                "comment": "",
            }

        # Open trade
        if d.get("entry") == 0 and d.get("action") in (0, 1):
            trades[pos_id]["open_time"] = d.get("time")
            trades[pos_id]["open_price"] = d.get("price")
            trades[pos_id]["direction"] = ACTION_MAP.get(d.get("action"), "UNKNOWN")
            trades[pos_id]["commission"] += abs(d.get("commission", 0))
            trades[pos_id]["comment"] = d.get("comment", "")

        # Close trade
        elif d.get("entry") == 1 and d.get("action") in (0, 1):
            trades[pos_id]["close_time"] = d.get("time")
            trades[pos_id]["close_price"] = d.get("price")
            trades[pos_id]["profit"] += d.get("profit", 0.0)
            trades[pos_id]["commission"] += abs(d.get("commission", 0))

        # Swap/Interest
        elif d.get("action") == 11:
            trades[pos_id]["swap"] += d.get("profit", 0.0)

    # Return only fully closed trades
    closed_trades = [t for t in trades.values() if t["open_time"] and t["close_time"]]
    return closed_trades

def fetch_ip_summary(limit=50, search=None):
    """
    Fetch all distinct IP addresses with count of accounts.
    Sorted by account count (descending).
    If search is provided, filters by IP address, login, or email.
    """
    if search:
        query = """
            SELECT last_ip AS ip, COUNT(*) AS accounts_count
            FROM users
            WHERE last_ip IS NOT NULL AND last_ip != ''
              AND (
                last_ip LIKE %s
                OR CAST(login AS CHAR) LIKE %s
                OR email LIKE %s
              )
            GROUP BY last_ip
            ORDER BY accounts_count DESC
            LIMIT %s
        """
        search_pattern = f"%{search}%"
        with get_mysql_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (search_pattern, search_pattern, search_pattern, limit))
            results = cursor.fetchall()
    else:
        query = """
            SELECT last_ip AS ip, COUNT(*) AS accounts_count
            FROM users
            WHERE last_ip IS NOT NULL AND last_ip != ''
            GROUP BY last_ip
            ORDER BY accounts_count DESC
            LIMIT %s
        """
        with get_mysql_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, (limit,))
            results = cursor.fetchall()
    return results


def fetch_accounts_by_ip(ip_address):
    """
    Fetch all accounts for a given IP address with more details.
    """
    query = """
        SELECT 
            login, 
            name, 
            email, 
            phone, 
            status, 
            `group`, 
            balance, 
            last_ip, 
            city, 
            country, 
            registration AS created
        FROM users
        WHERE last_ip = %s
        ORDER BY registration DESC
    """
    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (ip_address,))
        results = cursor.fetchall()
    return results

def _ts_to_datetime(ts):
    """
    Convert MT5 timestamps (seconds or milliseconds) to naive UTC datetime.
    """
    if not ts or not isinstance(ts, (int, float)):
        return None
    try:
        # Detect millisecond timestamps
        if ts > 1e12:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts, tz=dt_timezone.utc).replace(tzinfo=None)
    except Exception:
        return None


def fetch_user_open_positions(user_login, limit=200):
    """
    Fetch real-time open positions for a user with correct volume (lots),
    floating PnL, SL/TP, and normalized timestamps.

    Returns a list of dictionaries formatted for dashboard/risk engine use.
    """
    query = """
        SELECT 
            position,
            symbol,
            action,
            volume,
            digits,
            price_open,
            price_current,
            price_sl,
            price_tp,
            profit,
            storage,
            time_create,
            time_update
        FROM positions
        WHERE login = %s
        ORDER BY time_update DESC
        LIMIT %s
    """

    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (user_login, limit))
        rows = cursor.fetchall()

    positions = []
    for r in rows:
        lots = Decimal(r["volume"]) / Decimal("10000")
        pnl_float = Decimal(str(r["profit"])) + Decimal(str(r["storage"]))

        positions.append({
            "position_id": r["position"],
            "symbol": r["symbol"],
            "side": "BUY" if r["action"] == 0 else "SELL",
            "lots": float(lots),
            "open_price": float(r["price_open"]),
            "current_price": float(r["price_current"]),
            "sl": float(r["price_sl"]) if r["price_sl"] else None,
            "tp": float(r["price_tp"]) if r["price_tp"] else None,
            "floating_pnl": float(pnl_float),
            "digits": r["digits"],
            "opened_at": _ts_to_datetime(r["time_create"]),
            "updated_at": _ts_to_datetime(r["time_update"]),
        })

    return positions

def fetch_all_open_positions(limit=5000):
    """
    Fetch all currently open positions across all logins.
    Returns raw dict rows (dictionary=True) from MT5 'positions' table.
    """
    query = f"""
        SELECT
            position, login, symbol, action, volume, digits,
            price_open, price_current, price_sl, price_tp, profit, storage,
            time_create, time_update, dealer, expert_id, comment
        FROM positions
        ORDER BY time_update DESC
        LIMIT %s
    """
    with get_mysql_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, (limit,))
        return cursor.fetchall()

def normalize_position_row(r):
    """
    Map an MT5 'positions' row into a normalized dict for business logic.
    """
    lots = Decimal(r["volume"]) / Decimal("10000")
    side = "BUY" if r["action"] == 0 else "SELL"
    return {
        "position_id": r["position"],
        "login": r["login"],
        "symbol": r["symbol"],
        "side": side,
        "lots": lots,
        "digits": r["digits"],
        "open_price": Decimal(str(r["price_open"])),
        "current_price": Decimal(str(r["price_current"])),
        "sl": Decimal(str(r["price_sl"])),
        "tp": Decimal(str(r["price_tp"])),
        "profit": Decimal(str(r["profit"])),
        "storage": Decimal(str(r["storage"])),
        "changed_at": _ts_to_datetime(r["time_update"]),
        "changed_at_ts": r["time_update"],
        "dealer": int(r.get("dealer") or 0),
        "expert_id": Decimal(str(r.get("expert_id") or 0)),
        "comment": (r.get("comment") or ""),
    }