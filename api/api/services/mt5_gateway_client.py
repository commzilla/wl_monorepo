"""
MT5 Gateway REST API Client.

Replaces the old MT5Client that talked to a 3rd-party JSON-RPC API.
This client talks to our own MT5 Gateway at controller.we-fund.com.
"""
import logging
import uuid
from typing import Any, Dict, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MT5GatewayError(Exception):
    """Raised when the gateway returns an error response."""
    def __init__(self, message, status_code=None, error_data=None):
        self.status_code = status_code
        self.error_data = error_data or {}
        super().__init__(message)


class MT5GatewayClient:
    """
    REST client for the MT5 Gateway API.

    All methods return the parsed JSON response dict.
    On success: {'ok': True, 'data': {...}}
    On error: {'ok': False, 'error': '...'}
    """

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json',
        })

    def _request(self, method: str, path: str, timeout: int = 15, **kwargs) -> dict:
        """Make an HTTP request to the gateway."""
        url = f"{self.base_url}{path}"
        try:
            resp = self.session.request(method, url, timeout=timeout, **kwargs)
            data = resp.json()

            if resp.status_code >= 400:
                error_msg = data.get('error', resp.text)
                logger.error(f"Gateway API error: {method} {path} -> {resp.status_code}: {error_msg}")
                return {'ok': False, 'error': error_msg, 'status_code': resp.status_code}

            return data
        except requests.Timeout:
            logger.error(f"Gateway API timeout: {method} {path}")
            return {'ok': False, 'error': 'Gateway timeout'}
        except requests.ConnectionError:
            logger.error(f"Gateway API connection error: {method} {path}")
            return {'ok': False, 'error': 'Gateway unreachable'}
        except Exception as e:
            logger.exception(f"Gateway API unexpected error: {method} {path}")
            return {'ok': False, 'error': str(e)}

    # ── Health ──────────────────────────────────────────────────────────

    def health_check(self) -> dict:
        return self._request('GET', '/health/')

    def test_connection(self) -> dict:
        return self._request('GET', '/mt5/connect-test/')

    # ── User Management ────────────────────────────────────────────────

    def create_user(
        self,
        group: str,
        leverage: int,
        password: str,
        name: str = '',
        first_name: str = '',
        last_name: str = '',
        email: str = '',
        phone: str = '',
        country: str = '',
        state: str = '',
        city: str = '',
        address: str = '',
        zip_code: str = '',
        investor_password: str = '',
        account_enabled: bool = True,
        trading_enabled: bool = True,
        expert_advisor: bool = True,
        comment: str = '',
    ) -> dict:
        """Create a new MT5 trading account."""
        # Split name into first/last if not provided separately
        if name and not first_name:
            parts = name.strip().split(None, 1)
            first_name = parts[0] if parts else 'N/A'
            last_name = parts[1] if len(parts) > 1 else 'N/A'

        payload = {
            'group': group,
            'leverage': leverage,
            'password': password,
            'first_name': first_name or 'N/A',
            'last_name': last_name or 'N/A',
            'account_enabled': account_enabled,
            'trading_enabled': trading_enabled,
            'expert_advisor': expert_advisor,
        }
        # Only include optional string fields if non-blank
        for key, val in [
            ('name', name), ('email', email), ('phone', phone),
            ('country', country), ('state', state), ('city', city),
            ('address', address), ('zip_code', zip_code), ('comment', comment),
        ]:
            if val:
                payload[key] = val
        if investor_password:
            payload['investor_password'] = investor_password

        result = self._request('POST', '/users/', json=payload)
        # Normalize: ensure data.login exists (gateway returns data.user.login)
        if result.get('ok') and 'data' in result:
            data = result['data']
            if 'login' not in data and 'user' in data:
                data['login'] = data['user'].get('login')
        return result

    def get_user(self, login: int) -> dict:
        """Get user details including balance and equity."""
        return self._request('GET', f'/users/{login}/')

    def get_user_raw(self, login: int) -> dict:
        """Get raw MT5 user data (all fields)."""
        return self._request('GET', f'/users/{login}/raw/')

    def update_user(self, login: int, **fields) -> dict:
        """Update user profile fields."""
        return self._request('PATCH', f'/users/{login}/', json=fields)

    def set_account_status(self, login: int, enabled: bool) -> dict:
        """Enable or disable an MT5 account."""
        return self._request('PATCH', f'/users/{login}/account-status/',
                             json={'account_enabled': enabled})

    def set_trading_status(self, login: int, enabled: bool) -> dict:
        """Enable or disable trading on an MT5 account."""
        return self._request('PATCH', f'/users/{login}/trading-status/',
                             json={'trading_enabled': enabled})

    def change_group(self, login: int, group: str) -> dict:
        """Change MT5 account trading group."""
        return self._request('PATCH', f'/users/{login}/group/',
                             json={'group': group})

    def change_password(
        self,
        login: int,
        password: str = None,
        investor_password: str = None,
        phone_password: str = None,
    ) -> dict:
        """Change MT5 account password(s)."""
        payload = {}
        if password:
            payload['password'] = password
        if investor_password:
            payload['investor_password'] = investor_password
        if phone_password:
            payload['phone_password'] = phone_password
        return self._request('POST', f'/users/{login}/password/', json=payload)

    # ── Balance Operations (IDEMPOTENT) ────────────────────────────────

    @staticmethod
    def _make_idempotency_key(action: str, login: int, context_id: str = '') -> str:
        """Generate an idempotency key for balance operations."""
        ctx = f"-{context_id}" if context_id else ''
        return f"{action}-{login}{ctx}-{uuid.uuid4()}"

    def deposit(
        self,
        login: int,
        amount: float,
        comment: str = 'Deposit',
        idempotency_key: str = None,
    ) -> dict:
        """Deposit funds to MT5 account. Idempotent."""
        if idempotency_key is None:
            idempotency_key = self._make_idempotency_key('dep', login)
        return self._request('POST', f'/users/{login}/balance/', json={
            'action': 'deposit',
            'amount': abs(amount),
            'comment': comment,
            'idempotency_key': idempotency_key,
        })

    def withdraw(
        self,
        login: int,
        amount: float,
        comment: str = 'Withdrawal',
        idempotency_key: str = None,
    ) -> dict:
        """Withdraw funds from MT5 account. Idempotent."""
        if idempotency_key is None:
            idempotency_key = self._make_idempotency_key('wd', login)
        return self._request('POST', f'/users/{login}/balance/', json={
            'action': 'withdraw',
            'amount': abs(amount),
            'comment': comment,
            'idempotency_key': idempotency_key,
        })

    # ── Trading Data ───────────────────────────────────────────────────

    @staticmethod
    def _normalize_position(p: dict) -> dict:
        """Map gateway position field names to legacy format expected by the codebase."""
        p['order'] = p.get('ticket', p.get('order'))
        p['cmd'] = p.get('action', p.get('cmd'))
        p['open_time'] = p.get('time_create', p.get('open_time'))
        p['open_price'] = p.get('price_open', p.get('open_price'))
        p['current_price'] = p.get('price_current', p.get('current_price'))
        p['storage'] = p.get('swap', p.get('storage'))
        return p

    @staticmethod
    def _normalize_deal(d: dict) -> dict:
        """Map gateway deal field names to legacy format expected by the codebase."""
        d['cmd'] = d.get('action', d.get('cmd'))
        d['accountID'] = d.get('login', d.get('accountID'))
        d['open_time'] = d.get('time', d.get('open_time'))
        d['storage'] = d.get('swap', d.get('storage'))
        return d

    def get_open_positions(self, login: int) -> dict:
        """Get current open positions for a user."""
        result = self._request('GET', f'/trades/{login}/open/')
        if result.get('ok') and 'data' in result:
            positions = result['data'].get('positions', [])
            result['data']['positions'] = [self._normalize_position(p) for p in positions]
        return result

    def _normalize_deals_response(self, result: dict) -> dict:
        """Apply deal normalization to a response containing deals."""
        if result.get('ok') and 'data' in result:
            deals = result['data'].get('deals', [])
            result['data']['deals'] = [self._normalize_deal(d) for d in deals]
        return result

    def get_deals(self, login: int, days: int = 30, limit: int = 2000) -> dict:
        """Get deals for a user (last N days)."""
        result = self._request('GET', f'/trades/{login}/deals/',
                               params={'days': days, 'limit': limit})
        return self._normalize_deals_response(result)

    def get_deals_by_dates(self, login: int, from_date: str, to_date: str, limit: int = 2000) -> dict:
        """Get deals within a date range."""
        result = self._request('GET', f'/trades/{login}/deals/by-dates/',
                               params={'from_date': from_date, 'to_date': to_date, 'limit': limit})
        return self._normalize_deals_response(result)

    def get_open_orders(self, login: int) -> dict:
        """Get pending orders for a user."""
        return self._request('GET', f'/trades/{login}/orders/open/')

    def get_trade_legs(self, login: int, days: int = 30, limit: int = 2000) -> dict:
        """Get matched open/close trade pairs."""
        return self._request('GET', f'/trades/{login}/trade-legs/by-dates/',
                             params={'days': days, 'limit': limit})

    def close_all_positions(self, login: int, comment: str = 'Close All') -> dict:
        """Close all open positions for a user."""
        return self._request('POST', f'/trades/{login}/close-all/',
                             json={'comment': comment}, timeout=30)

    # ── Groups ─────────────────────────────────────────────────────────

    def get_groups(self, mask: str = '*', limit: int = 5000) -> dict:
        """List available trading groups."""
        return self._request('GET', '/groups/',
                             params={'mask': mask, 'limit': limit})

    # ── Database ───────────────────────────────────────────────────────

    def get_db_credentials(self) -> dict:
        """Get PostgreSQL connection credentials for direct queries."""
        return self._request('GET', '/database/credentials/')

    def get_sync_status(self) -> dict:
        """Check data sync freshness."""
        return self._request('GET', '/database/sync-status/')


# ── Singleton accessor ─────────────────────────────────────────────────

_client_instance: Optional[MT5GatewayClient] = None


def get_gateway_client() -> MT5GatewayClient:
    """Get or create the singleton gateway client."""
    global _client_instance
    if _client_instance is None:
        _client_instance = MT5GatewayClient(
            base_url=settings.MT5_GATEWAY_API_URL,
            api_key=settings.MT5_GATEWAY_API_KEY,
        )
    return _client_instance
