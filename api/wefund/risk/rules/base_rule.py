from typing import Any, Dict, Optional


class BaseRuleResult:
    """
    Standard result object for any risk rule.
    """

    def __init__(
        self,
        rule_name: str,
        passed: bool,
        breach_type: Optional[str] = None,  # "soft" or "hard"
        details: Optional[Any] = None
    ):
        self.rule_name = rule_name
        self.passed = passed
        self.breach_type = breach_type
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_name": self.rule_name,
            "passed": self.passed,
            "breach_type": self.breach_type,
            "details": self.details,
        }


class BaseRiskRule:
    """
    Abstract base for all risk rules.
    """

    # These should be overridden by subclasses
    rule_name: str = ""
    description: str = ""
    breach_type: str = ""  # "soft" or "hard"

    def check(self) -> BaseRuleResult:
        """
        Must be implemented by each rule.
        Should return a BaseRuleResult.
        """
        raise NotImplementedError("Risk rule must implement the check() method")
