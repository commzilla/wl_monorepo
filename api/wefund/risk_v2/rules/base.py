# wefund/risk_v2/rules/base.py
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Literal

from wefund.risk_v2.utils.helpers import TradeRecord

RuleCategory = Literal["soft", "consistency"]


def _clean_json(value):
    """Recursively convert Decimals → str, and clean lists/dicts."""
    if isinstance(value, Decimal):
        return str(value)

    if isinstance(value, dict):
        return {k: _clean_json(v) for k, v in value.items()}

    if isinstance(value, list):
        return [_clean_json(v) for v in value]

    return value


@dataclass
class RuleViolation:
    rule_code: str
    rule_name: str
    category: RuleCategory
    severity: int
    account_id: int
    order_id: int
    symbol: str
    description: str
    affected_pnl: Decimal
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_code": self.rule_code,
            "rule_name": self.rule_name,
            "category": self.category,
            "severity": self.severity,
            "account_id": self.account_id,
            "order_id": self.order_id,
            "symbol": self.symbol,
            "description": self.description,
            "affected_pnl": str(self.affected_pnl),
            "meta": _clean_json(self.meta),
        }

class BaseRule:
    """
    Base class for Risk Engine v2 rules.
    Every rule returns: List[RuleViolation]
    """

    code: str = "base"
    name: str = "Base Rule"
    category: RuleCategory = "soft"
    default_severity: int = 50  # mapped on 1–100 scale

    def __init__(self, severity: int | None = None) -> None:
        if severity is not None:
            self.default_severity = severity

    def run(self, trades: List[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        """
        Must be implemented by each rule.

        Parameters:
            trades: list of TradeRecord objects (not MT5Trade)
        """
        raise NotImplementedError("Rules must implement run()")
