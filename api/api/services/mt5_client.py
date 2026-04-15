import requests
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class MT5Client:
    def __init__(self, api_url, api_key):
        self.url = api_url
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key  # Optional: only include if your MT5 API expects it
        }

    def health_check(self):
        payload = {
            "method": "GetUserByLogin",
            "key": self.api_key,
            "array": [{"index": 0, "accountID": 1}]  # harmless fake ID
        }

        try:
            response = requests.post(self.url, json=payload, timeout=10)
            return {
                "reachable": True,
                "status_code": response.status_code,
                "raw": response.text
            }
        except Exception as e:
            return {
                "reachable": False,
                "error": str(e)
            }


    def add_user(self, user_data_array):
        payload = {
            "method": "AddUser",
            "key": self.api_key,
            "array": user_data_array
        }

        import json

        # 🔥 PRINT THE EXACT RAW REQUEST THAT GOES TO MT5
        logger.error(
            "\n\n============ 📤 MT5 RAW REQUEST ============\n"
            f"URL: {self.url}\n"
            f"Headers: {self.headers}\n"
            f"Payload:\n{json.dumps(payload, indent=4)}\n"
            "============================================\n"
        )

        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=15)

            # 🔥 PRINT RAW RESPONSE (before parsing JSON)
            logger.error(
                "\n\n============ 📥 MT5 RAW RESPONSE ============\n"
                f"Status Code: {response.status_code}\n"
                f"Body:\n{response.text}\n"
                "============================================\n"
            )

            response.raise_for_status()

            try:
                return response.json()
            except Exception:
                return {
                    "response": "Invalid JSON",
                    "raw": response.text
                }

        except Exception as e:
            logger.exception("MT5 AddUser API call failed")
            return {
                "response": "Abort",
                "systemErrorStatus": str(e),
                "applicationStatus": "Failed to call MT5"
            }

    
    def get_account_details(self, account_id: int) -> Dict[str, Any]:
        """
        Fetch full MT5 account details (user, group, permissions, balances, etc.)
        using GetUserByLogin.
        """
        payload = {
            "method": "GetUserByLogin",
            "key": self.api_key,
            "array": [{"index": 0, "accountID": int(account_id)}]
        }

        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus", "") == "":
                if data.get("array"):
                    account_data = data["array"][0]
                    return {
                        "success": True,
                        "account_id": account_id,
                        "details": account_data,  # Full raw object from MT5
                        "applicationStatus": data.get("applicationStatus", "")
                    }
                else:
                    return {"success": False, "error": "No account data found"}
            else:
                return {
                    "success": False,
                    "error": data.get("systemErrorStatus"),
                    "applicationStatus": data.get("applicationStatus", "")
                }

        except requests.RequestException as e:
            logger.exception("MT5 GetAccountDetails API call failed")
            return {"success": False, "error": str(e), "data": None}
        
    def get_account_balance(self, account_id):
        payload = {
            "method": "GetUserByLogin",
            "key": self.api_key,
            "array": [{"index": 0, "accountID": account_id}]
        }
        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus") == "" and data.get("array"):
                account_data = data["array"][0]
                balance = account_data.get("pltAccount", {}).get("balance")
                return {"account_id": account_id, "balance": balance}
            else:
                return {
                    "error": data.get("systemErrorStatus", "Unknown error"),
                    "applicationStatus": data.get("applicationStatus", "")
                }
        except Exception as e:
            logger.exception("MT5 GetUserByLogin API call failed")
            return {"error": str(e), "applicationStatus": "Failed to call MT5"}
        
    def get_closed_trades(self, account_id, start_ts, end_ts):
        """
        Fetch only closed trades within a date range.
        """
        payload = {
            "method": "GetUserTradesByDate",
            "key": self.api_key,
            "accountID": account_id,
            "start": start_ts,
            "end": end_ts
        }
        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            trades = response.json().get("array", [])
            # Filter out only trades that have close_time > 0
            closed_trades = [t for t in trades if t.get("close_time", 0) > 0]
            return closed_trades
        except Exception as e:
            logger.exception("MT5 GetUserTradesByDate API call failed")
            return []

    def get_open_trades(self, account_id):
        """
        Fetch currently open trades for a user.
        """
        payload = {
            "method": "GetUserOpenTrades",
            "key": self.api_key,
            "accountID": account_id
        }
        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            return response.json().get("array", [])
        except Exception as e:
            logger.exception("MT5 GetUserOpenTrades API call failed")
            return []
        
    def withdraw_profit(self, account_id, amount, comment="Trader Profit Withdrawal"):
        """
        Submits a negative deposit (withdrawal) to the trader's MT5 account.
        """
        if not account_id or not amount or amount <= 0:
            logger.warning(f"Invalid withdrawal request: account_id={account_id}, amount={amount}")
            return {"success": False, "error": "Invalid withdrawal parameters."}

        payload = {
            "method": "Deposit",
            "key": self.api_key,
            "array": [
                {
                    "index": 0,
                    "accountID": int(account_id),
                    "comment": comment,
                    "amount": float(-abs(amount))  # negative amount for withdrawal
                }
            ]
        }

        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=10)
            response.raise_for_status()
            result = response.json()

            # ✅ Accept both "" and MT_RET_REQUEST_DONE as success
            if (
                result.get("systemErrorStatus", "") == ""
                and result.get("applicationStatus", "") in ["", "MT_RET_REQUEST_DONE"]
            ):
                return {"success": True}
            else:
                return {"success": False, "error": result.get("applicationStatus", "Unknown error")}
        except Exception as e:
            logger.error("MT5 withdrawal error: %s", str(e))
            return {"success": False, "error": str(e)}            

    def deposit_funds(self, account_id, amount, comment="Initial Deposit"):
        """
        Submits a positive deposit to the trader's MT5 account.
        """
        if not account_id or not amount or amount <= 0:
            logger.warning(f"Invalid deposit request: account_id={account_id}, amount={amount}")
            return {"success": False, "error": "Invalid deposit parameters."}

        payload = {
            "method": "Deposit",
            "key": self.api_key,
            "array": [
                {
                    "index": 0,
                    "accountID": int(account_id),
                    "comment": comment,
                    "amount": float(amount)  # Positive for deposit
                }
            ]
        }

        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=10)
            response.raise_for_status()
            result = response.json()

            if (
                result.get("systemErrorStatus", "") == ""
                and result.get("applicationStatus", "") in ["", "MT_RET_REQUEST_DONE"]
            ):
                return {"success": True}
            else:
                return {"success": False, "error": result.get("applicationStatus", "Unknown error")}
        except Exception as e:
            logger.error("MT5 deposit error: %s", str(e))
            return {"success": False, "error": str(e)}
    
    def close_open_trades(self, account_id):
        """
        Sends a request to close all open trades for the specified MT5 account.
        """
        if not account_id:
            logger.warning("Missing account_id for CloseOpenTrades.")
            return {"success": False, "error": "Account ID is required."}

        payload = {
            "method": "CloseOpenTrades",
            "key": self.api_key,
            "accountID": int(account_id)
        }

        try:
            response = requests.post(self.url, json=payload, headers=self.headers, timeout=15)
            response.raise_for_status()
            result = response.json()

            # Accept empty systemErrorStatus and applicationStatus as success
            if (
                result.get("systemErrorStatus", "") == ""
                and result.get("applicationStatus", "") in ["", "MT_RET_REQUEST_DONE"]
            ):
                return {"success": True}
            else:
                return {
                    "success": False,
                    "error": result.get("applicationStatus", "Unknown error"),
                    "systemErrorStatus": result.get("systemErrorStatus", "")
                }
        except Exception as e:
            logger.error("MT5 CloseOpenTrades error: %s", str(e))
            return {"success": False, "error": str(e)}
        

    def activate_trading(self, account_id: int) -> bool:
        """
        Enable trading for the given MT5 account by updating user info with canTrade=True.
        """
        try:
            # --- Step 1: Get current user info ---
            get_payload = {
                "method": "GetUserByLogin",
                "key": self.api_key,
                "array": [{"index": 0, "accountID": int(account_id)}]
            }
            response = requests.post(self.url, json=get_payload, headers=self.headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus") not in (None, "") or not data.get("array"):
                logger.warning(f"[activate_trading] Failed to fetch user info for {account_id}: {data}")
                return False

            user_info = data["array"][0]

            # --- Step 2: Build update payload ---
            update_payload = {
                "method": "SetUserInfo",
                "key": self.api_key,
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

            # --- Step 3: Send update request ---
            update_resp = requests.post(self.url, json=update_payload, headers=self.headers, timeout=15)
            update_resp.raise_for_status()
            update_data = update_resp.json()

            success = update_data.get("systemErrorStatus") in (None, "")
            if not success:
                logger.warning(f"[activate_trading] Failed for {account_id}: {update_data}")

            return success

        except Exception as e:
            logger.error(f"[activate_trading] Exception for account {account_id}: {e}")
            return False
        
    def disable_trading(self, account_id: int) -> bool:
        """
        Disable trading for the given MT5 account by updating user info with canTrade=False.
        """
        try:
            # --- Step 1: Get current user info ---
            get_payload = {
                "method": "GetUserByLogin",
                "key": self.api_key,
                "array": [{"index": 0, "accountID": int(account_id)}]
            }
            response = requests.post(self.url, json=get_payload, headers=self.headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus") not in (None, "") or not data.get("array"):
                logger.warning(f"[disable_trading] Failed to fetch user info for {account_id}: {data}")
                return False

            user_info = data["array"][0]

            # --- Step 2: Build update payload ---
            update_payload = {
                "method": "SetUserInfo",
                "key": self.api_key,
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
                "canTrade": False,  # ❌ disable trading
                "enableExpertAdvisor": False,
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

            # --- Step 3: Send update request ---
            update_resp = requests.post(self.url, json=update_payload, headers=self.headers, timeout=15)
            update_resp.raise_for_status()
            update_data = update_resp.json()

            success = update_data.get("systemErrorStatus") in (None, "")
            if not success:
                logger.warning(f"[disable_trading] Failed for {account_id}: {update_data}")

            return success

        except Exception as e:
            logger.error(f"[disable_trading] Exception for account {account_id}: {e}")
            return False

    def enable_account(self, account_id: int) -> bool:
        """
        Enable the MT5 account (isEnabled=True).
        """
        try:
            # --- Step 1: Get current user info ---
            get_payload = {
                "method": "GetUserByLogin",
                "key": self.api_key,
                "array": [{"index": 0, "accountID": int(account_id)}]
            }
            response = requests.post(self.url, json=get_payload, headers=self.headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus") not in (None, "") or not data.get("array"):
                logger.warning(f"[enable_account] Failed to fetch user info for {account_id}: {data}")
                return False

            user_info = data["array"][0]

            # --- Step 2: Build update payload ---
            update_payload = {
                "method": "SetUserInfo",
                "key": self.api_key,
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
                "isEnabled": True,  # ✅ enable account
                "canTrade": user_info.get("canTrade", True),
                "enableExpertAdvisor": user_info.get("enableExpertAdvisor", True),
                "enableAPIConnection": user_info.get("enableAPIConnection", False),
                "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
                "hasSendReportEnabled": user_info.get("user", {}).get("hasSendReportEnabled", True),
                "password_phone": user_info.get("user", {}).get("password_phone", ""),
                "id": user_info.get("user", {}).get("id", ""),
                "status": user_info.get("user", {}).get("status", ""),
                "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
                "groupName": user_info.get("group", {}).get("name", ""),
                "user_color": user_info.get("user", {}).get("user_color", 4278190080),
            }

            # --- Step 3: Send update request ---
            update_resp = requests.post(self.url, json=update_payload, headers=self.headers, timeout=15)
            update_resp.raise_for_status()
            update_data = update_resp.json()

            success = update_data.get("systemErrorStatus") in (None, "")
            if not success:
                logger.warning(f"[enable_account] Failed for {account_id}: {update_data}")

            return success

        except Exception as e:
            logger.error(f"[enable_account] Exception for account {account_id}: {e}")
            return False

    def disable_account(self, account_id: int) -> bool:
        """
        Disable the MT5 account (isEnabled=False).
        """
        try:
            # --- Step 1: Get current user info ---
            get_payload = {
                "method": "GetUserByLogin",
                "key": self.api_key,
                "array": [{"index": 0, "accountID": int(account_id)}]
            }
            response = requests.post(self.url, json=get_payload, headers=self.headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            if data.get("systemErrorStatus") not in (None, "") or not data.get("array"):
                logger.warning(f"[disable_account] Failed to fetch user info for {account_id}: {data}")
                return False

            user_info = data["array"][0]

            # --- Step 2: Build update payload ---
            update_payload = {
                "method": "SetUserInfo",
                "key": self.api_key,
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
                "isEnabled": False,  # ❌ disable account
                "canTrade": user_info.get("canTrade", False),
                "enableExpertAdvisor": user_info.get("enableExpertAdvisor", False),
                "enableAPIConnection": user_info.get("enableAPIConnection", False),
                "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
                "hasSendReportEnabled": user_info.get("user", {}).get("hasSendReportEnabled", True),
                "password_phone": user_info.get("user", {}).get("password_phone", ""),
                "id": user_info.get("user", {}).get("id", ""),
                "status": user_info.get("user", {}).get("status", ""),
                "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
                "groupName": user_info.get("group", {}).get("name", ""),
                "user_color": user_info.get("user", {}).get("user_color", 4278190080),
            }

            # --- Step 3: Send update request ---
            update_resp = requests.post(self.url, json=update_payload, headers=self.headers, timeout=15)
            update_resp.raise_for_status()
            update_data = update_resp.json()

            success = update_data.get("systemErrorStatus") in (None, "")
            if not success:
                logger.warning(f"[disable_account] Failed for {account_id}: {update_data}")

            return success

        except Exception as e:
            logger.error(f"[disable_account] Exception for account {account_id}: {e}")
            return False
        
    def change_group(self, account_id: int, new_group: str) -> bool:
        """
        Change MT5 account group.
        """
        try:
            # Step 1 — Get current user info
            get_payload = {
                "method": "GetUserByLogin",
                "key": self.api_key,
                "array": [{"index": 0, "accountID": int(account_id)}]
            }
            resp = requests.post(self.url, json=get_payload, headers=self.headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            if data.get("systemErrorStatus") not in (None, "") or not data.get("array"):
                logger.warning(f"[change_group] Failed to fetch user info for {account_id}: {data}")
                return False

            user_info = data["array"][0]

            # Step 2 — Build payload with new group
            update_payload = {
                "method": "SetUserInfo",
                "key": self.api_key,
                "accountID": int(account_id),

                # all required user info
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
                "canTrade": user_info.get("canTrade", True),
                "enableExpertAdvisor": user_info.get("enableExpertAdvisor", True),
                "enableAPIConnection": user_info.get("enableAPIConnection", False),

                "enable_change_password": user_info.get("user", {}).get("enable_change_password", True),
                "hasSendReportEnabled": user_info.get("user", {}).get("hasSendReportEnabled", True),
                "password_phone": user_info.get("user", {}).get("password_phone", ""),
                "id": user_info.get("user", {}).get("id", ""),
                "status": user_info.get("user", {}).get("status", ""),
                "taxes": user_info.get("pltAccount", {}).get("taxes", 1.0),
                "groupName": new_group,  # ✅ change group
                "user_color": user_info.get("user", {}).get("user_color", 4278190080),
            }

            # Step 3 — Send update
            update_resp = requests.post(self.url, json=update_payload, headers=self.headers, timeout=15)
            update_resp.raise_for_status()
            update_data = update_resp.json()

            success = update_data.get("systemErrorStatus") in (None, "")
            if not success:
                logger.warning(f"[change_group] Failed for {account_id}: {update_data}")
            return success

        except Exception as e:
            logger.error(f"[change_group] Exception for account {account_id}: {e}")
            return False


    def change_password(
        self,
        account_id: int,
        main_password: str = None,
        investor_password: str = None,
        mode: str = "main",
    ) -> bool:
        """
        Change MT5 account password(s).

        Args:
            account_id (int): MT5 account ID.
            main_password (str): New main password (required if mode='main' or 'both').
            investor_password (str): New investor password (required if mode='investor' or 'both').
            mode (str): 'main', 'investor', or 'both'.

        Returns:
            bool: True if all password updates succeed, False otherwise.
        """
        try:
            if mode not in ("main", "investor", "both"):
                logger.warning(f"[change_password] Invalid mode '{mode}' for account {account_id}")
                return False

            # Build password tasks based on mode
            tasks = []
            if mode in ("main", "both"):
                if not main_password:
                    logger.warning(f"[change_password] Missing main_password for {account_id}")
                    return False
                tasks.append(("main", 1, main_password))

            if mode in ("investor", "both"):
                if not investor_password:
                    logger.warning(f"[change_password] Missing investor_password for {account_id}")
                    return False
                tasks.append(("investor", 2, investor_password))

            success_all = True

            for label, update_code, password in tasks:
                payload = {
                    "method": "ChangeUserPasswords",
                    "key": self.api_key,
                    "accountID": int(account_id),
                    "updateWhichPassword": update_code,  # 1 = main, 2 = investor
                    "thePassword": password,
                }

                resp = requests.post(self.url, json=payload, headers=self.headers, timeout=15)
                resp.raise_for_status()
                data = resp.json()

                if data.get("systemErrorStatus") not in (None, ""):
                    logger.warning(f"[change_password] Failed for {account_id} ({label}): {data}")
                    success_all = False
                else:
                    logger.info(f"[change_password] Success for {account_id} ({label}): {data.get('applicationStatus')}")

            return success_all

        except Exception as e:
            logger.error(f"[change_password] Exception for account {account_id}: {e}")
            return False        