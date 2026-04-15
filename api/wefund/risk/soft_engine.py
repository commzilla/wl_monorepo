import importlib
import pkgutil
from pathlib import Path

from django.conf import settings
from .base_rule import BaseRule

SOFT_RULES_PATH = Path(__file__).resolve().parent / "rules"

def load_soft_rules():
    """
    Dynamically loads all soft breach rule classes from wefund/risk/rules/.
    We exclude hard breach rules like max_daily_loss.py, max_total_loss.py, inactivity.py.
    """
    excluded_files = {
    "max_daily_loss",
    "max_total_loss",
    "inactivity",
    "martingale",
    "grid",
    "pyramid",
    "all_in",
    "hedging",
    "account_management",
    "__init__"
    }
    rules = []

    package = "wefund.risk.rules"

    for _, module_name, _ in pkgutil.iter_modules([str(SOFT_RULES_PATH)]):
        if module_name in excluded_files:
            continue

        module = importlib.import_module(f"{package}.{module_name}")

        # Find any class in the module that inherits BaseRule
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if isinstance(attr, type) and issubclass(attr, BaseRule) and attr is not BaseRule:
                rules.append(attr())

    return rules


def evaluate_soft_breaches(account_id):
    """
    Runs all soft breach rules for the given account_id.
    Returns list of breach messages if any.
    """
    breaches = []
    rules = load_soft_rules()

    for rule in rules:
        result = rule.check(account_id)
        if result:  # If check returns a message or dict, add to breaches
            breaches.append({
                "rule": rule.__class__.__name__,
                "message": result
            })

    return breaches