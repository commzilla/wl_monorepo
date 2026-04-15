"""
AI Training Example Service for Support Chat.
Implements dynamic few-shot learning from human feedback.
"""
import logging
from typing import List, Dict, Optional
from django.core.cache import cache
from django.db.models import Q

logger = logging.getLogger(__name__)

TRAINING_CACHE_KEY = "ai_training_examples_v1"
TRAINING_CACHE_TTL = 300  # 5 minutes


class TrainingExampleService:
    """Service for fetching and formatting AI training examples from human feedback."""

    @classmethod
    def get_relevant_examples(
        cls,
        user_query: str,
        issue_categories: List[str] = None,
        max_examples: int = 5
    ) -> List[Dict]:
        """
        Fetch training examples relevant to the current user query.

        Args:
            user_query: The current user's question
            issue_categories: Optional list of detected categories
            max_examples: Maximum number of examples to return

        Returns:
            List of formatted training examples
        """
        if not user_query:
            return []

        # Try cache first
        cache_key = f"{TRAINING_CACHE_KEY}:{hash(user_query[:100])}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:max_examples]

        # Fetch approved training examples
        examples = cls._fetch_training_examples(issue_categories)

        if not examples:
            return []

        # Score and rank by relevance
        scored_examples = cls._score_examples(examples, user_query)

        # Take top N
        top_examples = sorted(scored_examples, key=lambda x: x['score'], reverse=True)[:max_examples]

        # Format for prompt injection
        formatted = cls._format_examples(top_examples)

        # Cache results
        cache.set(cache_key, formatted, TRAINING_CACHE_TTL)

        return formatted

    @classmethod
    def _fetch_training_examples(cls, issue_categories: List[str] = None) -> List[Dict]:
        """Fetch all approved training examples from database."""
        from wefund.models import SupportAIFeedback, SupportMessage

        try:
            # Query feedback marked as training examples with good/excellent ratings or corrections
            # Include: rating >= 4 OR has non-empty correction
            query = SupportAIFeedback.objects.filter(
                should_be_training_example=True
            ).filter(
                Q(rating__gte=4) | (Q(correction_made__isnull=False) & ~Q(correction_made=''))
            ).select_related('message', 'message__conversation').order_by(
                '-training_priority', '-created_at'
            )[:100]

            examples = []
            for feedback in query:
                if not feedback.message:
                    continue

                # Get the original user question
                ai_message = feedback.message
                conversation = ai_message.conversation

                user_message = SupportMessage.objects.filter(
                    conversation=conversation,
                    sender_type='user',
                    created_at__lt=ai_message.created_at
                ).order_by('-created_at').first()

                if not user_message:
                    continue

                # Use correction if provided, otherwise use the original AI response
                response_text = feedback.correction_made if feedback.correction_made else ai_message.content

                examples.append({
                    'question': user_message.content,
                    'original_response': ai_message.content,
                    'corrected_response': feedback.correction_made if feedback.correction_made else None,
                    'rating': feedback.rating or 0,
                    'priority': feedback.training_priority or 5,
                    'categories': feedback.issue_categories or [],
                })

            return examples

        except Exception as e:
            logger.error(f"Error fetching training examples: {e}")
            return []

    @classmethod
    def _score_examples(cls, examples: List[Dict], user_query: str) -> List[Dict]:
        """Score examples by relevance to the current query."""
        query_words = set(user_query.lower().split())
        query_keywords = cls._extract_keywords(user_query)

        for example in examples:
            score = example['priority']  # Base score from priority

            # Word overlap scoring
            example_words = set(example['question'].lower().split())
            score += len(query_words & example_words) * 2

            # Keyword matching (higher value for domain-specific terms)
            example_keywords = cls._extract_keywords(example['question'])
            score += len(query_keywords & example_keywords) * 5

            # Correction bonus (corrections are very valuable)
            if example['corrected_response']:
                score += 10

            # High rating bonus
            if example['rating'] >= 5:
                score += 5
            elif example['rating'] >= 4:
                score += 3

            example['score'] = score

        return examples

    @classmethod
    def _extract_keywords(cls, text: str) -> set:
        """Extract important domain-specific keywords from text."""
        important_terms = {
            'payout', 'withdrawal', 'deposit', 'phase', 'challenge', 'evaluation',
            'profit', 'drawdown', 'breach', 'account', 'trading', 'mt5', 'login',
            'password', 'reset', 'refund', 'split', 'target', 'rules', 'violation',
            'certificate', 'kyc', 'verification', 'funded', 'scaling', 'balance',
            'daily', 'total', 'trailing', 'static', 'limit', 'cap', 'news',
            'weekend', 'hft', 'ea', 'expert', 'advisor', 'martingale', 'grid',
            'consistency', 'lot', 'size', 'minimum', 'maximum', 'days', 'time'
        }
        text_lower = text.lower()
        return {term for term in important_terms if term in text_lower}

    @classmethod
    def _format_examples(cls, examples: List[Dict]) -> List[Dict]:
        """Format examples for prompt injection."""
        return [{
            'question': ex['question'],
            'response': ex['corrected_response'] or ex['original_response'],
            'was_corrected': bool(ex['corrected_response']),
        } for ex in examples]

    @classmethod
    def invalidate_cache(cls):
        """Invalidate all training example caches."""
        try:
            # Try django-redis pattern deletion
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            keys = redis_conn.keys(f"*{TRAINING_CACHE_KEY}*")
            if keys:
                redis_conn.delete(*keys)
            logger.info(f"Training examples cache invalidated ({len(keys)} keys)")
        except ImportError:
            # Fallback for non-redis cache backends
            cache.delete(TRAINING_CACHE_KEY)
            logger.info("Training examples cache invalidated (fallback)")
        except Exception as e:
            logger.warning(f"Could not invalidate cache via redis, using fallback: {e}")
            cache.delete(TRAINING_CACHE_KEY)

    @classmethod
    def format_for_prompt(cls, examples: List[Dict]) -> str:
        """
        Format training examples as a prompt section for injection into system instruction.

        Args:
            examples: List of formatted training examples

        Returns:
            Formatted string for prompt injection
        """
        if not examples:
            return ""

        sections = [
            "\n\n## LEARNED RESPONSES FROM HUMAN FEEDBACK",
            "The following are real examples that human support agents have reviewed and approved.",
            "Use these as guidance for how to respond to similar questions:\n"
        ]

        for i, ex in enumerate(examples, 1):
            note = " (Human-corrected)" if ex.get('was_corrected') else " (Agent-approved)"
            sections.append(f"**Example {i}**{note}")
            sections.append(f"Customer Question: {ex['question']}")
            sections.append(f"Approved Response: {ex['response']}")
            sections.append("")

        sections.append("Use these examples to inform your response style and accuracy.")

        return "\n".join(sections)
