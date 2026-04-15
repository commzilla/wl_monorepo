import os
from dotenv import load_dotenv
from django.conf import settings
import time
import requests
from eth_account import Account
from eth_account.messages import encode_defunct

RISE_API = "https://b2b-api.riseworks.io/v1"

PRIVATE_KEY = os.getenv("RISE_COMPANY_PRIVATE_KEY", "")
WALLET = Account.from_key(settings.RISE_COMPANY_PRIVATE_KEY).address if settings.RISE_COMPANY_PRIVATE_KEY else None
COMPANY_RISEID = os.getenv("RISE_COMPANY_RISEID")

class RiseInviteError(Exception):
    pass


def _get_siwe_message(wallet: str) -> str:
    """Fetch SIWE message from Rise API and return the exact message string."""
    resp = requests.get(f"{RISE_API}/auth/api/siwe", params={"wallet": wallet}, timeout=10)
    if resp.status_code != 200:
        raise RiseInviteError(f"Failed to get SIWE message: {resp.status_code} {resp.text}")
    data = resp.json().get("data")
    if not data or "message" not in data:
        raise RiseInviteError("Malformed SIWE GET response")

    message = data["message"]

    # debug: show exact raw representation (useful while testing)
    print("=== RAW SIWE MESSAGE ===")
    print(repr(message))
    print("========================")

    return message


def _post_siwe_exchange(message: str, signature: str, wallet: str):
    """POST to /auth/api/siwe with the given message/signature/wallet and return Response."""
    return requests.post(
        f"{RISE_API}/auth/api/siwe",
        json={"message": message, "signature": signature, "wallet": wallet},
        timeout=10,
    )


def _try_signature_variants(message: str, private_key: str, wallet: str):
    """
    Try a few common signature encodings:
      1) 0x + raw signature from eth_account
      2) raw signature (no 0x)
      3) v converted from 0/1 -> 27/28 and prefixed with 0x
    Returns token_data on success or raises RiseInviteError with last response.
    """
    # Prepare eth-account signature
    eth_msg = encode_defunct(text=message)
    signed = Account.sign_message(eth_msg, private_key=private_key)
    raw_sig_bytes = signed.signature  # bytes

    variants = []

    # 1) 0x + hex
    variants.append("0x" + raw_sig_bytes.hex())

    # 2) hex without 0x (some servers accept this)
    variants.append(raw_sig_bytes.hex())

    # 3) if v is 0 or 1, convert to 27/28
    v = raw_sig_bytes[-1]
    if v in (0, 1):
        r = raw_sig_bytes[:32]
        s = raw_sig_bytes[32:64]
        v2 = bytes([v + 27])
        sig_v27 = r + s + v2
        variants.append("0x" + sig_v27.hex())

    last_resp = None
    for sig in variants:
        print("Trying signature variant:", sig[:10] + "..." if len(sig) > 16 else sig)
        resp = _post_siwe_exchange(message, sig, wallet)
        last_resp = resp
        # success -> return parsed data
        if resp.status_code == 200:
            data = resp.json().get("data")
            if data and "token" in data:
                return data
            # If 200 but no data/token, break and raise later
            break
        # If signature invalid (400), continue trying other variants
        # For any other error, we may also retry variants but bubble up after.
    # If we get here, none worked
    if last_resp is not None:
        raise RiseInviteError(f"Failed to exchange signature: {last_resp.status_code} {last_resp.text}")
    raise RiseInviteError("Failed to exchange signature: no response from server")


def get_rise_token(wallet: str, private_key: str) -> str:
    """
    Complete flow:
    1) fetch SIWE message
    2) try signature variants and post to /auth/api/siwe
    Returns the token string.
    """
    # 1) fetch message (use the exact string returned)
    message = _get_siwe_message(wallet)

    # 2) try signature encodings/variants
    token_data = _try_signature_variants(message, private_key, wallet)

    token = token_data.get("token")
    if not token:
        raise RiseInviteError("Malformed SIWE POST response: missing token")
    print("=== RISE TOKEN RECEIVED ===")
    print(token)
    print("===========================")
    return token


def invite_user_via_rise(emails: list, role: str = "contractor", anonymous: bool = False):
    """
    Invite users using Rise B2B API. This function will:
      - perform SIWE auth (get token)
      - call /invites with the token
    """
    token = get_rise_token(WALLET, PRIVATE_KEY)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "inviteList": emails,
        "company_riseid": COMPANY_RISEID,
        "role": role,
        "anonymous": anonymous,
    }

    resp = requests.post(f"{RISE_API}/invites", json=payload, headers=headers, timeout=10)
    if resp.status_code != 200:
        raise RiseInviteError(f"Invite failed: {resp.status_code} {resp.text}")
    return resp.json()
