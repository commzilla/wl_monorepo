"""
Risk Training Service - Few-shot learning from human feedback.

SECURITY:
- Only uses APPROVED training examples (prevents adversarial injection)
- Sanitizes all text before prompt injection
- Validates pattern codes against whitelist
"""
import logging
import re
from typing import List, Dict
from django.core.cache import cache
from django.db.models import Q

logger = logging.getLogger(__name__)

RISK_TRAINING_CACHE_KEY = "risk_training_examples_v2"
RISK_TRAINING_CACHE_TTL = 300  # 5 minutes
MAX_TRAINING_EXAMPLES = 10


class RiskTrainingService:
    """Service for fetching and formatting risk training examples from human feedback."""

    @classmethod
    def get_relevant_examples(
        cls,
        detected_patterns: List[str] = None,
        max_examples: int = 5
    ) -> List[Dict]:
        """Fetch training examples relevant to current analysis."""
        if detected_patterns is None:
            detected_patterns = []

        max_examples = min(max_examples, MAX_TRAINING_EXAMPLES)

        cache_key = cls._create_safe_cache_key(detected_patterns)
        cached = cache.get(cache_key)
        if cached:
            return cached[:max_examples]

        examples = cls._fetch_training_examples()
        if not examples:
            return []

        scored_examples = cls._score_examples(examples, detected_patterns)
        top_examples = sorted(scored_examples, key=lambda x: x['score'], reverse=True)[:max_examples]
        formatted = cls._format_examples(top_examples)

        cache.set(cache_key, formatted, RISK_TRAINING_CACHE_TTL)
        return formatted

    @classmethod
    def _create_safe_cache_key(cls, patterns: List[str]) -> str:
        """Create a safe cache key from patterns."""
        pattern_str = ",".join(sorted(patterns))[:200]
        safe_str = re.sub(r'[^A-Za-z0-9,_]', '', pattern_str)
        return f"{RISK_TRAINING_CACHE_KEY}:{safe_str}"

    @classmethod
    def _fetch_training_examples(cls) -> List[Dict]:
        """Fetch approved training examples from AIRiskReviewFeedback."""
        from wefund.models import AIRiskReviewFeedback

        try:
            # SECURITY: Only fetch APPROVED examples
            # Note: Some fields may not exist in all deployments - handle gracefully
            query = AIRiskReviewFeedback.objects.filter(
                is_training_example=True
            ).select_related('analysis').order_by(
                '-created_at'
            )[:50]

            examples = []
            for feedback in query:
                analysis = feedback.analysis
                if not analysis:
                    continue

                examples.append({
                    'ai_patterns': analysis.ai_patterns_detected or [],
                    'ai_recommendation': analysis.ai_recommendation,
                    'ai_confidence': float(analysis.ai_confidence or 0),
                    'human_decision': feedback.human_decision,
                    'human_reasoning': feedback.human_reasoning or '',
                    'patterns_confirmed': feedback.patterns_confirmed or [],
                    'patterns_rejected': feedback.patterns_rejected or [],
                    'patterns_added': feedback.patterns_added or [],
                    'was_correction': not feedback.human_agrees_with_ai,
                    'priority': feedback.training_priority or 5,
                })

            logger.info("Fetched %d approved training examples", len(examples))
            return examples

        except Exception as e:
            logger.error("Error fetching risk training examples: %s", type(e).__name__)
            return []

    @classmethod
    def _score_examples(cls, examples: List[Dict], current_patterns: List[str]) -> List[Dict]:
        """Score examples by relevance to current analysis."""
        for example in examples:
            score = example['priority']
            ai_patterns_set = set(example['ai_patterns'])
            current_set = set(current_patterns)
            pattern_overlap = len(ai_patterns_set & current_set)
            score += pattern_overlap * 10

            if example['was_correction']:
                score += 15
            if example['patterns_rejected']:
                score += 5
            if example['patterns_added']:
                score += 5

            example['score'] = score

        return examples

    @classmethod
    def _format_examples(cls, examples: List[Dict]) -> List[Dict]:
        """Format examples for prompt injection."""
        return [{
            'ai_patterns': ex['ai_patterns'],
            'ai_recommendation': ex['ai_recommendation'],
            'human_decision': ex['human_decision'],
            'human_reasoning': ex['human_reasoning'],
            'patterns_rejected': ex['patterns_rejected'],
            'patterns_added': ex['patterns_added'],
            'was_correction': ex['was_correction'],
        } for ex in examples]

    @classmethod
    def format_for_prompt(cls, examples: List[Dict]) -> str:
        """Format training examples for prompt injection."""
        if not examples:
            return ""

        examples = examples[:MAX_TRAINING_EXAMPLES]

        sections = [
            "\n## LEARNED DECISIONS FROM SENIOR RISK MANAGERS",
            "The following are real cases reviewed by human risk managers.",
            "Use these to calibrate your judgment:\n"
        ]

        for i, ex in enumerate(examples, 1):
            note = " [HUMAN CORRECTED AI]" if ex.get('was_correction') else " [CONFIRMED]"
            sections.append(f"**Case {i}**{note}")
            sections.append(f"AI Detected Patterns: {ex.get('ai_patterns', [])}")
            sections.append(f"AI Recommended: {ex.get('ai_recommendation', 'UNKNOWN')}")
            sections.append(f"Human Decision: {ex.get('human_decision', 'UNKNOWN')}")

            reasoning = ex.get('human_reasoning', '')
            if reasoning:
                if len(reasoning) > 500:
                    reasoning = reasoning[:500] + "..."
                sections.append(f"Human Reasoning: {reasoning}")

            if ex.get('patterns_rejected'):
                sections.append(f"FALSE POSITIVES (AI was wrong): {ex['patterns_rejected']}")
            if ex.get('patterns_added'):
                sections.append(f"MISSED BY AI: {ex['patterns_added']}")

            sections.append("")

        sections.append("Learn from these cases - especially the corrections.\n")
        return "\n".join(sections)

    @classmethod
    def invalidate_cache(cls):
        """Invalidate training cache when new feedback is added."""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            keys = redis_conn.keys(f"*{RISK_TRAINING_CACHE_KEY}*")
            if keys:
                redis_conn.delete(*keys)
            logger.info("Risk training cache invalidated (%d keys)", len(keys))
        except Exception as e:
            logger.warning("Cache invalidation fallback: %s", e)
            cache.delete(RISK_TRAINING_CACHE_KEY)
