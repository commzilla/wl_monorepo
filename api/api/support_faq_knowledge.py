"""
FAQ Knowledge Builder for Support Chat Widget.
Implements compound phrase detection, relevance scoring, and tiered retrieval.
"""
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# ===================================================================
# COMPOUND PHRASE DEFINITIONS
# ===================================================================

COMPOUND_PHRASES = [
    # Trading Rules
    {'phrase': 'lot size', 'synonyms': ['position size', 'trade size', 'lot'], 'weight': 15},
    {'phrase': 'daily drawdown', 'synonyms': ['daily dd', 'max daily loss', 'mdl', 'daily loss limit'], 'weight': 15},
    {'phrase': 'max drawdown', 'synonyms': ['maximum drawdown', 'total drawdown', 'mtl', 'max total loss'], 'weight': 15},
    {'phrase': 'profit target', 'synonyms': ['target profit', 'profit goal', 'target'], 'weight': 12},
    {'phrase': 'trading days', 'synonyms': ['minimum days', 'min trading days', 'active days'], 'weight': 12},

    # Consistency Rules
    {'phrase': 'consistency rule', 'synonyms': ['consistency check', 'consistency scoring', 'lot consistency'], 'weight': 10},
    {'phrase': 'profit split', 'synonyms': ['payout split', 'profit share', 'split percentage'], 'weight': 10},

    # Account Related
    {'phrase': 'account size', 'synonyms': ['account balance', 'starting balance', 'initial balance'], 'weight': 10},
    {'phrase': 'phase 1', 'synonyms': ['first phase', 'evaluation phase', 'step 1'], 'weight': 10},
    {'phrase': 'phase 2', 'synonyms': ['second phase', 'verification phase', 'step 2'], 'weight': 10},
    {'phrase': 'live account', 'synonyms': ['funded account', 'real account', 'prop account'], 'weight': 12},

    # Payouts
    {'phrase': 'payout request', 'synonyms': ['withdrawal request', 'profit withdrawal'], 'weight': 12},
    {'phrase': 'payout day', 'synonyms': ['withdrawal day', 'payment day', 'bi-weekly'], 'weight': 10},
    {'phrase': 'payout status', 'synonyms': ['withdrawal status', 'payment status'], 'weight': 10},

    # Rules & Violations
    {'phrase': 'hard breach', 'synonyms': ['account breach', 'rule violation', 'breach'], 'weight': 15},
    {'phrase': 'soft breach', 'synonyms': ['warning', 'soft violation'], 'weight': 10},
    {'phrase': 'news trading', 'synonyms': ['news event', 'high impact news'], 'weight': 10},
    {'phrase': 'weekend holding', 'synonyms': ['holding over weekend', 'weekend positions'], 'weight': 10},

    # Technical
    {'phrase': 'mt5 account', 'synonyms': ['metatrader 5', 'mt5', 'trading account'], 'weight': 8},
    {'phrase': 'login credentials', 'synonyms': ['mt5 login', 'account login', 'credentials'], 'weight': 8},
]

# Priority collections that should always have full content
PRIORITY_COLLECTIONS = [
    'Trading Rules Overview',
    'Trading Rules',
    'Risk and Drawdown Rules',
    'Drawdown Rules',
    'Payouts and Withdrawals',
    'Payouts',
    'Account Management',
    'Getting Started',
]

# Common stop words to filter out
STOP_WORDS = {
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if',
    'or', 'because', 'until', 'while', 'what', 'which', 'who', 'whom',
    'this', 'that', 'these', 'those', 'am', 'i', 'my', 'me', 'we', 'our',
    'you', 'your', 'he', 'she', 'it', 'they', 'them', 'his', 'her', 'its',
    'their', 'about', 'please', 'help', 'need', 'want', 'know', 'get',
}


# ===================================================================
# FAQ KNOWLEDGE BUILDER
# ===================================================================

class FAQKnowledgeBuilder:
    """
    Builds FAQ context for AI prompts with relevance scoring.
    """

    def __init__(self):
        self.compound_phrases = COMPOUND_PHRASES
        self.priority_collections = PRIORITY_COLLECTIONS
        self.stop_words = STOP_WORDS

    def build_context(
        self,
        user_query: Optional[str] = None,
        max_articles: int = 30,
        max_content_length: int = 800,
        tiered_retrieval: bool = True,
    ) -> str:
        """
        Build FAQ context for AI prompt.

        Args:
            user_query: User's question for relevance scoring
            max_articles: Maximum articles to include
            max_content_length: Max characters per article content
            tiered_retrieval: Use tiered retrieval (full + summaries)

        Returns:
            str: Formatted FAQ context
        """
        from wefund.models import FAQArticle, FAQCollection

        try:
            # Fetch all active articles with collections
            articles = FAQArticle.objects.filter(
                is_active=True,
                collection__is_active=True
            ).select_related('collection').order_by('collection__display_order', 'display_order')

            if not articles.exists():
                return "No FAQ articles available."

            # Score and rank by relevance if query provided
            if user_query:
                scored_articles = self._score_articles(articles, user_query)
                # Sort by score descending
                scored_articles.sort(key=lambda x: x[1], reverse=True)
                articles_list = [article for article, score in scored_articles[:max_articles]]
            else:
                articles_list = list(articles[:max_articles])

            # Build context with tiered retrieval
            if tiered_retrieval and user_query:
                return self._build_tiered_context(articles_list, max_content_length)
            else:
                return self._build_flat_context(articles_list, max_content_length)

        except Exception as e:
            logger.error(f"Error building FAQ context: {e}")
            return "FAQ knowledge base temporarily unavailable."

    def _score_articles(self, articles, query: str) -> list:
        """
        Score articles by relevance to query.

        Args:
            articles: QuerySet of FAQArticle
            query: User's search query

        Returns:
            list of (article, score) tuples
        """
        # Extract keywords and compound phrases
        keywords = self.extract_keywords(query)
        detected_phrases = self.extract_compound_phrases(query)

        scored = []
        for article in articles:
            score = self._calculate_relevance(
                article,
                keywords,
                detected_phrases,
                article.collection.title
            )
            scored.append((article, score))

        return scored

    def _calculate_relevance(
        self,
        article,
        keywords: list,
        phrases: list,
        collection_title: str
    ) -> float:
        """
        Calculate relevance score for an article.

        Scoring:
        - Compound phrase in title: phrase.weight * 2
        - Compound phrase in content: phrase.weight * 1
        - Keyword in title: 10 points (+ 5 bonus for exact match)
        - Keyword in search_keywords: 8 points
        - Keyword in collection: 6 points
        - Keyword in content: 3 points (+ bonus for multiple occurrences)
        - Priority collection boost: +2
        """
        score = 0.0
        title_lower = article.title.lower()
        content_lower = article.content.lower()
        collection_lower = collection_title.lower()
        search_keywords = [kw.lower() for kw in (article.search_keywords or [])]

        # Score compound phrases
        for phrase_info in phrases:
            phrase = phrase_info['phrase'].lower()
            weight = phrase_info['weight']

            if phrase in title_lower:
                score += weight * 2
            elif phrase in content_lower:
                score += weight

            # Check synonyms
            for synonym in phrase_info.get('synonyms', []):
                if synonym.lower() in title_lower:
                    score += weight * 1.5
                elif synonym.lower() in content_lower:
                    score += weight * 0.5

        # Score individual keywords
        for keyword in keywords:
            keyword_lower = keyword.lower()

            # Title match (highest value)
            if keyword_lower in title_lower:
                score += 10
                # Exact word match bonus
                if re.search(rf'\b{re.escape(keyword_lower)}\b', title_lower):
                    score += 5

            # Search keywords match
            if keyword_lower in search_keywords or any(keyword_lower in kw for kw in search_keywords):
                score += 8

            # Collection match
            if keyword_lower in collection_lower:
                score += 6

            # Content match
            if keyword_lower in content_lower:
                score += 3
                # Bonus for multiple occurrences
                occurrences = content_lower.count(keyword_lower)
                score += min(occurrences - 1, 3)  # Max +3 bonus

        # Priority collection boost
        if any(pc.lower() in collection_lower for pc in self.priority_collections):
            score += 2

        return score

    def extract_keywords(self, query: str) -> list:
        """
        Extract meaningful keywords from query.

        Args:
            query: User's search query

        Returns:
            list of keywords
        """
        # Remove punctuation and split
        words = re.findall(r'\b[a-zA-Z0-9]+\b', query.lower())

        # Filter stop words and short words
        keywords = [
            word for word in words
            if word not in self.stop_words and len(word) > 2
        ]

        return keywords

    def extract_compound_phrases(self, query: str) -> list:
        """
        Detect compound phrases in query.

        Args:
            query: User's search query

        Returns:
            list of matched phrase_info dicts
        """
        query_lower = query.lower()
        detected = []

        for phrase_info in self.compound_phrases:
            phrase = phrase_info['phrase'].lower()

            # Check main phrase
            if phrase in query_lower:
                detected.append(phrase_info)
                continue

            # Check synonyms
            for synonym in phrase_info.get('synonyms', []):
                if synonym.lower() in query_lower:
                    detected.append(phrase_info)
                    break

        return detected

    def _build_tiered_context(self, articles: list, max_content_length: int) -> str:
        """
        Build tiered context: full content for top articles, summaries for rest.

        Args:
            articles: Sorted list of articles
            max_content_length: Max characters per article

        Returns:
            str: Formatted tiered context
        """
        if not articles:
            return "No relevant FAQ articles found."

        tier_1_count = min(15, len(articles))
        tier_1 = articles[:tier_1_count]
        tier_2 = articles[tier_1_count:tier_1_count + 15]

        sections = []

        # Tier 1: Full content
        if tier_1:
            sections.append("### Tier 1 - Most Relevant Articles (Full Content):")
            for article in tier_1:
                content = article.content
                collection = article.collection.title

                # Check if priority collection - don't truncate
                is_priority = any(pc.lower() in collection.lower() for pc in self.priority_collections)

                if not is_priority and len(content) > max_content_length:
                    content = content[:max_content_length] + "..."

                sections.append(f"\n**[{collection}] {article.title}**\n{content}")

        # Tier 2: Summaries only
        if tier_2:
            sections.append("\n### Tier 2 - Related Articles (Summaries):")
            for article in tier_2:
                summary = article.content[:200] + "..." if len(article.content) > 200 else article.content
                sections.append(f"\n- **{article.title}**: {summary}")

        return "\n".join(sections)

    def _build_flat_context(self, articles: list, max_content_length: int) -> str:
        """
        Build flat context: all articles with content.

        Args:
            articles: List of articles
            max_content_length: Max characters per article

        Returns:
            str: Formatted flat context
        """
        if not articles:
            return "No FAQ articles available."

        # Group by collection
        collections = {}
        for article in articles:
            collection_title = article.collection.title
            if collection_title not in collections:
                collections[collection_title] = []
            collections[collection_title].append(article)

        sections = []
        for collection_title, collection_articles in collections.items():
            sections.append(f"\n## {collection_title}")

            for article in collection_articles:
                content = article.content
                if len(content) > max_content_length:
                    content = content[:max_content_length] + "..."

                sections.append(f"\n**{article.title}**\n{content}")

        return "\n".join(sections)

    def search(self, query: str, limit: int = 10) -> list:
        """
        Search FAQ articles and return with relevance scores.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            list of article dicts with relevance_score
        """
        from wefund.models import FAQArticle

        try:
            articles = FAQArticle.objects.filter(
                is_active=True,
                collection__is_active=True
            ).select_related('collection')

            scored = self._score_articles(articles, query)
            scored.sort(key=lambda x: x[1], reverse=True)

            results = []
            for article, score in scored[:limit]:
                if score > 0:  # Only include relevant results
                    results.append({
                        'id': str(article.id),
                        'title': article.title,
                        'content': article.content,
                        'collection_title': article.collection.title,
                        'relevance_score': round(score, 2),
                    })

            return results

        except Exception as e:
            logger.error(f"FAQ search error: {e}")
            return []


# ===================================================================
# SINGLETON BUILDER
# ===================================================================

_builder = None


def get_faq_knowledge_builder() -> FAQKnowledgeBuilder:
    """Get or create singleton builder."""
    global _builder
    if _builder is None:
        _builder = FAQKnowledgeBuilder()
    return _builder
