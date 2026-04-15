from decimal import Decimal
from wefund.mt5_client import MT5Client
from django.conf import settings
import logging
import requests

logger = logging.getLogger(__name__)

mt5_client = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)

def get_user_by_login(account_id: int):
    try:
        payload = {
            "method": "GetUserByLogin",
            "array": [{"index": 0, "accountID": int(account_id)}]
        }
        response = mt5_client.call(payload)
        logger.debug(f"[get_user_by_login] response for {account_id}: {response}")

        if response.get("systemErrorStatus") == "" and response.get("array"):
            return response["array"][0]
        logger.warning(f"[get_user_by_login] No valid user info for {account_id}: {response}")
        return None
    except Exception as e:
        logger.error(f"[get_user_by_login] Error fetching user info for {account_id}: {e}")
        return None

def get_leverage_for_account(account_id: int) -> Decimal | None:
    try:
        payload = {
            "method": "GetUserByLogin",
            "key": settings.MT5_API_KEY,
            "array": [{"index": 0, "accountID": int(account_id)}]
        }
        response = mt5_client.call(payload)
        logger.debug(f"[get_leverage_for_account] response for {account_id}: {response}")

        if response.get("systemErrorStatus") == "" and response.get("array"):
            user_info = response["array"][0].get("user", {})
            leverage = user_info.get("leverage")
            if leverage is not None:
                return Decimal(str(leverage))
            else:
                logger.warning(f"[get_leverage_for_account] Leverage not found in user info for {account_id}")
        else:
            logger.warning(f"[get_leverage_for_account] API error for {account_id}: {response}")
        return None
    except Exception as e:
        logger.error(f"[get_leverage_for_account] Exception fetching leverage for {account_id}: {e}")
        return None

def get_equity_for_account(account_id: int) -> Decimal | None:
    url = settings.MT5_API_URL
    api_key = settings.MT5_API_KEY

    payload = {
        "method": "GetUserByLogin",
        "key": api_key,
        "array": [
            {
                "index": 0,
                "accountID": int(account_id)
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()

        if data.get("systemErrorStatus") == "" and data.get("array"):
            account_info = data["array"][0]
            plt_account = account_info.get("pltAccount", {})
            equity = plt_account.get("prevEquity", 0)
            return Decimal(str(equity))
        else:
            logger.warning(f"[get_equity_for_account] MT5 API error for {account_id}: {data.get('systemErrorStatus')} / {data.get('applicationStatus')}")
            return None
    except Exception as e:
        logger.error(f"[get_equity_for_account] Exception fetching equity for {account_id}: {e}")
        return None


def get_balance_for_account(account_id: int) -> Decimal | None:
    account_data = get_user_by_login(account_id)
    if account_data and "pltAccount" in account_data:
        balance = account_data["pltAccount"].get("balance", 0)
        return Decimal(str(balance))
    return None


def get_open_trades(account_id: int):
    try:
        payload = {
            "method": "GetUserOpenTrades",
            "accountID": int(account_id),
            "start": 0,
            "end": 2147483647
        }
        response = mt5_client.call(payload)
        if response and response.get("array"):
            return response["array"]
        return []
    except Exception as e:
        logger.warning(f"[get_open_trades] Failed to fetch open trades for {account_id}: {e}")
        return []


def disable_trading(account_id: int) -> bool:
    try:
        # Step 1: Get user info with flat fields
        get_payload = {
            "method": "GetUserByLogin",
            "key": mt5_client.api_key,
            "array": [{"index": 0, "accountID": int(account_id)}]
        }
        response = mt5_client.call(get_payload)
        if response.get("systemErrorStatus") != "" or not response.get("array"):
            logger.warning(f"[disable_trading] Failed to fetch user info for {account_id}: {response}")
            return False

        user_info = response["array"][0]

        # Flatten fields from user_info and user_info['user'] and user_info['group'] as needed
        updated_info = {
            "method": "SetUserInfo",
            "key": mt5_client.api_key,
            "accountID": int(account_id),

            "name": user_info.get("user", {}).get("name", ""),
            "email": user_info.get("user", {}).get("email", ""),
            "phone": user_info.get("user", {}).get("phone", ""),
            "address": user_info.get("user", {}).get("address", {}).get("address", ""),
            "city": user_info.get("user", {}).get("address", {}).get("city", ""),
            "state": user_info.get("user", {}).get("address", {}).get("state", ""),
            "zipcode": user_info.get("user", {}).get("address", {}).get("zipcode", ""),
            "country": user_info.get("user", {}).get("address", {}).get("country", ""),
            "agentAccount": user_info.get("user", {}).get("agentAccount", 0),
            "comment": user_info.get("user", {}).get("comment", ""),
            "leverage": user_info.get("user", {}).get("leverage", 0),
            "isEnabled": user_info.get("isEnabled", True),
            "canTrade": False,  # disable trading
            "enableExpertAdvisor": False,  # include defaults or from user_info if needed
            "enableAPIConnection": False,
            "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
            "hasSendReportEnabled": user_info.get("user", {}).get("hasSendReportEnabled", True),
            "password_phone": user_info.get("user", {}).get("password_phone", ""),
            "id": user_info.get("user", {}).get("id", ""),
            "status": user_info.get("user", {}).get("status", ""),
            "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
            "groupName": user_info.get("group", {}).get("name", ""),
            "user_color": user_info.get("user", {}).get("user_color", 4278190080),
        }

        # Remove any None or empty string values if necessary (optional)

        update_response = mt5_client.call(updated_info)

        success = update_response.get("systemErrorStatus") == ""

        if not success:
            logger.warning(f"[disable_trading] Failed to disable trading for {account_id}: {update_response}")

        return success

    except Exception as e:
        logger.error(f"[disable_trading] Exception for account {account_id}: {e}")
        return False

def activate_trading(account_id: int) -> bool:
    try:
        # Step 1: Get user info with flat fields
        get_payload = {
            "method": "GetUserByLogin",
            "key": mt5_client.api_key,
            "array": [{"index": 0, "accountID": int(account_id)}]
        }
        response = mt5_client.call(get_payload)
        if response.get("systemErrorStatus") != "" or not response.get("array"):
            logger.warning(f"[activate_trading] Failed to fetch user info for {account_id}: {response}")
            return False

        user_info = response["array"][0]

        # Flatten fields from user_info and user_info['user'] and user_info['group'] as needed
        updated_info = {
            "method": "SetUserInfo",
            "key": mt5_client.api_key,
            "accountID": int(account_id),

            "name": user_info.get("user", {}).get("name", ""),
            "email": user_info.get("user", {}).get("email", ""),
            "phone": user_info.get("user", {}).get("phone", ""),
            "address": user_info.get("user", {}).get("address", {}).get("address", ""),
            "city": user_info.get("user", {}).get("address", {}).get("city", ""),
            "state": user_info.get("user", {}).get("address", {}).get("state", ""),
            "zipcode": user_info.get("user", {}).get("address", {}).get("zipcode", ""),
            "country": user_info.get("user", {}).get("address", {}).get("country", ""),
            "agentAccount": user_info.get("user", {}).get("agentAccount", 0),
            "comment": user_info.get("user", {}).get("comment", ""),
            "leverage": user_info.get("user", {}).get("leverage", 0),
            "isEnabled": user_info.get("isEnabled", True),
            "canTrade": True,   # ✅ enable trading
            "enableExpertAdvisor": True,
            "enableAPIConnection": False,
            "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
            "hasSendReportEnabled": user_info.get("user", {}).get("hasSendReportEnabled", True),
            "password_phone": user_info.get("user", {}).get("password_phone", ""),
            "id": user_info.get("user", {}).get("id", ""),
            "status": user_info.get("user", {}).get("status", ""),
            "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
            "groupName": user_info.get("group", {}).get("name", ""),
            "user_color": user_info.get("user", {}).get("user_color", 4278190080),
        }

        # Remove any None or empty string values if necessary (optional)

        update_response = mt5_client.call(updated_info)

        success = update_response.get("systemErrorStatus") == ""

        if not success:
            logger.warning(f"[activate_trading] Failed to activate trading for {account_id}: {update_response}")

        return success

    except Exception as e:
        logger.error(f"[activate_trading] Exception for account {account_id}: {e}")
        return False


def disable_account(account_id: int) -> bool:
    """
    Fully disables an MT5 account (cannot login, cannot trade).
    """
    try:
        # Step 1: Get user info
        get_payload = {
            "method": "GetUserByLogin",
            "key": mt5_client.api_key,
            "array": [{"index": 0, "accountID": int(account_id)}]
        }
        response = mt5_client.call(get_payload)
        if response.get("systemErrorStatus") != "" or not response.get("array"):
            logger.warning(f"[disable_account] Failed to fetch user info for {account_id}: {response}")
            return False

        user_info = response["array"][0]

        # Step 2: Build updated payload (clone of disable_trading but with isEnabled=False)
        updated_info = {
            "method": "SetUserInfo",
            "key": mt5_client.api_key,
            "accountID": int(account_id),

            "name": user_info.get("user", {}).get("name", ""),
            "email": user_info.get("user", {}).get("email", ""),
            "phone": user_info.get("user", {}).get("phone", ""),
            "address": user_info.get("user", {}).get("address", {}).get("address", ""),
            "city": user_info.get("user", {}).get("address", {}).get("city", ""),
            "state": user_info.get("user", {}).get("address", {}).get("state", ""),
            "zipcode": user_info.get("user", {}).get("address", {}).get("zipcode", ""),
            "country": user_info.get("user", {}).get("address", {}).get("country", ""),
            "agentAccount": user_info.get("user", {}).get("agentAccount", 0),
            "comment": user_info.get("user", {}).get("comment", ""),
            "leverage": user_info.get("user", {}).get("leverage", 0),

            # 🔴 Full disable: account login + trading blocked
            "isEnabled": True,
            "canTrade": False,

            "enableExpertAdvisor": False,
            "enableAPIConnection": False,
            "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
            "hasSendReportEnabled": user_info.get("hasSendReportEnabled", True),
            "password_phone": user_info.get("user", {}).get("password_phone", ""),
            "id": user_info.get("user", {}).get("id", ""),
            "status": user_info.get("user", {}).get("status", ""),
            "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
            "groupName": user_info.get("group", {}).get("name", ""),
            "user_color": user_info.get("user", {}).get("user_color", 4278190080),
        }

        # Step 3: Push update
        update_response = mt5_client.call(updated_info)

        success = update_response.get("systemErrorStatus") == ""
        if not success:
            logger.warning(f"[disable_account] Failed to disable account {account_id}: {update_response}")

        return success

    except Exception as e:
        logger.error(f"[disable_account] Exception for account {account_id}: {e}")
        return False