"""
Admin AI Assistant — Training Example Service.
Implements few-shot learning from admin feedback.
"""
import logging
from typing import List, Dict, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)

ADMIN_TRAINING_CACHE_KEY = "admin_ai_training_v1"
ADMIN_TRAINING_CACHE_TTL = 300  # 5 minutes


class AdminAITrainingService:
    """Service for fetching and formatting training examples for admin AI."""

    @classmethod
    def get_relevant_examples(
        cls,
        user_query: str,
        max_examples: int = 5,
    ) -> List[Dict]:
        """
        Fetch training examples relevant to the admin's query.

        Args:
            user_query: Current admin question
            max_examples: Maximum examples to return

        Returns:
            List of formatted training examples
        """
        if not user_query:
            return []

        # Try cache
        cache_key = f"{ADMIN_TRAINING_CACHE_KEY}:{hash(user_query[:100])}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:max_examples]

        # Fetch from DB
        examples = cls._fetch_examples()
        if not examples:
            return []

        # Score and rank
        scored = cls._score_examples(examples, user_query)
        top = sorted(scored, key=lambda x: x['score'], reverse=True)[:max_examples]

        # Format
        formatted = [{
            'question': ex['question'],
            'response': ex['ideal_response'],
        } for ex in top if ex['score'] > 0]

        cache.set(cache_key, formatted, ADMIN_TRAINING_CACHE_TTL)
        return formatted

    @classmethod
    def _fetch_examples(cls) -> List[Dict]:
        """Fetch all active training examples from database."""
        from wefund.models import AdminAITrainingExample

        try:
            examples = AdminAITrainingExample.objects.filter(
                is_active=True
            ).order_by('-weight', '-created_at')[:100]

            return [{
                'question': ex.question,
                'ideal_response': ex.ideal_response,
                'weight': ex.weight,
                'tags': ex.tags or [],
                'issue_type': ex.issue_type,
            } for ex in examples]

        except Exception as e:
            logger.error(f"Error fetching admin training examples: {e}")
            return []

    @classmethod
    def _score_examples(cls, examples: List[Dict], query: str) -> List[Dict]:
        """Score examples by relevance."""
        query_words = set(query.lower().split())
        query_keywords = cls._extract_keywords(query)

        for ex in examples:
            score = ex['weight']  # Base score

            # Word overlap
            ex_words = set(ex['question'].lower().split())
            score += len(query_words & ex_words) * 2

            # Keyword matching
            ex_keywords = cls._extract_keywords(ex['question'])
            score += len(query_keywords & ex_keywords) * 5

            # Tag matching
            for tag in (ex.get('tags') or []):
                if tag.lower() in query.lower():
                    score += 3

            ex['score'] = score

        return examples

    @classmethod
    def _extract_keywords(cls, text: str) -> set:
        """Extract domain-specific keywords."""
        important_terms = {
            'enrollment', 'trader', 'payout', 'deposit', 'withdraw',
            'breach', 'account', 'mt5', 'trading', 'password', 'group',
            'kyc', 'balance', 'equity', 'drawdown', 'profit', 'loss',
            'phase', 'challenge', 'activate', 'disable', 'enable',
            'close', 'trades', 'order', 'refund', 'certificate',
        }
        text_lower = text.lower()
        return {term for term in important_terms if term in text_lower}

    @classmethod
    def create_from_feedback(cls, feedback) -> Optional[object]:
        """
        Create a training example from admin feedback.

        Args:
            feedback: AdminAIFeedback instance

        Returns:
            AdminAITrainingExample or None
        """
        from wefund.models import AdminAITrainingExample

        if not feedback.correction_text:
            return None

        try:
            # Get the original question from conversation
            msg = feedback.message
            conv = msg.conversation

            # Find the admin message before the AI response
            admin_msg = conv.messages.filter(
                role='admin',
                created_at__lt=msg.created_at,
            ).order_by('-created_at').first()

            if not admin_msg:
                return None

            example = AdminAITrainingExample.objects.create(
                question=admin_msg.content,
                ideal_response=feedback.correction_text,
                source_feedback=feedback,
                weight=7,  # Feedback-derived examples get moderate weight
                issue_type=feedback.issue_type,
                tags=[feedback.issue_type] if feedback.issue_type else [],
            )

            cls.invalidate_cache()
            return example

        except Exception as e:
            logger.error(f"Error creating training example from feedback: {e}")
            return None

    @classmethod
    def invalidate_cache(cls):
        """Invalidate all admin training caches."""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            keys = redis_conn.keys(f"*{ADMIN_TRAINING_CACHE_KEY}*")
            if keys:
                redis_conn.delete(*keys)
        except (ImportError, Exception):
            cache.delete(ADMIN_TRAINING_CACHE_KEY)
