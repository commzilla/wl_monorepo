"""
Support Chat Services - Main orchestration layer.
Coordinates message processing, AI responses, and FAQ search.
"""
import logging
from typing import Optional
from django.utils import timezone
from django.db import transaction

from wefund.models import (
    SupportAIConfig,
    SupportConversation,
    SupportMessage,
    AgentShiftSchedule,
    AgentShiftOverride,
)
from api.support_ai import (
    get_gemini_client,
    ContextBuilder,
    PromptBuilder,
    GUEST_CONTEXT_ADDENDUM,
)
from api.support_emotional import get_emotional_analyzer
from api.support_faq_knowledge import get_faq_knowledge_builder
from api.utils.event_logger import log_event

logger = logging.getLogger(__name__)


# ===================================================================
# SHIFT-AWARE AGENT ASSIGNMENT
# ===================================================================

def get_on_shift_agents(now=None):
    """
    Return a queryset of support/admin agents currently on shift.

    Logic:
    1. If zero AgentShiftSchedule records exist → return ALL support agents (backward compat).
    2. For each agent with schedules, check override for today first:
       - is_blocked override → agent is OFF
       - custom hours override → use those hours instead of weekly schedule
    3. Fall back to weekly schedule for the current day.
    4. Handles per-agent timezone conversion (UTC → agent's tz).
    5. Handles overnight shifts (e.g. 22:00-06:00).
    """
    import pytz
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if now is None:
        now = timezone.now()

    # If no shift schedules exist at all, return all support agents (backward compat)
    if not AgentShiftSchedule.objects.exists():
        return User.objects.filter(
            is_active=True,
            is_staff=True,
            role__in=['support', 'admin']
        )

    # Get all support/admin agents who have at least one shift schedule
    agents_with_schedules = User.objects.filter(
        is_active=True,
        is_staff=True,
        role__in=['support', 'admin'],
        shift_schedules__isnull=False,
    ).distinct()

    on_shift_ids = []

    for agent in agents_with_schedules:
        # Convert now to agent's timezone
        agent_tz_name = 'UTC'
        # Get tz from agent's most recent schedule
        first_schedule = agent.shift_schedules.filter(is_active=True).first()
        if first_schedule:
            agent_tz_name = first_schedule.timezone or 'UTC'

        try:
            agent_tz = pytz.timezone(agent_tz_name)
        except pytz.UnknownTimeZoneError:
            agent_tz = pytz.UTC

        agent_now = now.astimezone(agent_tz)
        agent_today = agent_now.date()
        agent_time = agent_now.time()
        agent_dow = agent_today.weekday()  # 0=Monday

        # Check for date override first
        overrides = AgentShiftOverride.objects.filter(
            agent=agent,
            date=agent_today,
        )

        if overrides.exists():
            # Has override(s) for today
            blocked = overrides.filter(is_blocked=True).exists()
            if blocked:
                # Agent is off today
                continue

            # Custom hours override(s)
            is_on = False
            for override in overrides.filter(is_blocked=False):
                ov_start = override.start_time
                ov_end = override.end_time
                if ov_start and ov_end:
                    if ov_start <= ov_end:
                        if ov_start <= agent_time <= ov_end:
                            is_on = True
                            break
                    else:
                        # Overnight custom hours
                        if agent_time >= ov_start or agent_time <= ov_end:
                            is_on = True
                            break
            if is_on:
                on_shift_ids.append(agent.id)
            continue

        # No override — check weekly schedule
        schedules = agent.shift_schedules.filter(
            is_active=True,
            day_of_week=agent_dow,
        )

        # Also check previous day for overnight shifts
        prev_dow = (agent_dow - 1) % 7
        overnight_schedules = agent.shift_schedules.filter(
            is_active=True,
            day_of_week=prev_dow,
        )

        is_on = False
        for sched in schedules:
            if sched.start_time <= sched.end_time:
                # Normal shift (e.g. 09:00-17:00)
                if sched.start_time <= agent_time <= sched.end_time:
                    is_on = True
                    break
            else:
                # Overnight shift starting today (e.g. 22:00-06:00)
                if agent_time >= sched.start_time:
                    is_on = True
                    break

        if not is_on:
            # Check if an overnight shift from the previous day covers now
            for sched in overnight_schedules:
                if sched.start_time > sched.end_time:
                    # Previous day's overnight shift — we're in the morning portion
                    if agent_time <= sched.end_time:
                        is_on = True
                        break

        if is_on:
            on_shift_ids.append(agent.id)

    return User.objects.filter(id__in=on_shift_ids)


def get_least_loaded_agent(now=None):
    """
    Pick the on-shift agent with the fewest active/escalated conversations.
    Implements round-robin-like fair distribution.

    Returns:
        User instance or None if no agents on shift.
    """
    from django.db.models import Count, Q

    agents = get_on_shift_agents(now=now)
    if not agents.exists():
        return None

    # Annotate each agent with count of non-resolved assigned conversations
    agents_with_load = agents.annotate(
        active_conversations=Count(
            'assigned_support_conversations',
            filter=Q(assigned_support_conversations__status__in=['active', 'escalated']),
        )
    ).order_by('active_conversations', 'first_name')

    return agents_with_load.first()


# ===================================================================
# SUPPORT CHAT SERVICE
# ===================================================================

class SupportChatService:
    """
    Main service for processing chat messages and generating AI responses.
    """

    @staticmethod
    def process_user_message(
        conversation: SupportConversation,
        user_message: str,
        attachment: Optional[dict] = None,
        request=None,
    ) -> dict:
        """
        Process a user message and generate AI response.

        Flow:
        1. Save user message to DB
        2. Check if AI is enabled
        3. Get conversation history
        4. Build user context
        5. Build FAQ context
        6. Analyze emotional state
        7. Check for abusive content → immediate escalation
        8. Build system prompt
        9. Select model (simple vs complex)
        10. Call Gemini API
        11. Validate response
        12. Save AI response
        13. Return result

        Args:
            conversation: SupportConversation instance
            user_message: User's message text
            attachment: Optional attachment dict
            request: HTTP request object

        Returns:
            dict with user_message, ai_response, escalated, emotional_level, model_used
        """
        config = SupportAIConfig.get_config()
        user = conversation.user

        # 1. Save user message
        user_msg = SupportChatService._save_user_message(
            conversation, user_message, user, attachment
        )

        result = {
            'user_message': SupportChatService._serialize_message(user_msg),
            'ai_response': None,
            'escalated': False,
            'flagged_for_review': False,
            'emotional_level': 'calm',
            'model_used': None,
        }

        # 2. Check if AI is enabled
        if not config.ai_enabled or not conversation.ai_enabled:
            logger.info(f"AI disabled for conversation {conversation.id}")
            return result

        # 3. Get conversation history (last 20 messages)
        history = list(
            conversation.messages.filter(is_internal=False)
            .order_by('-created_at')[:20]
        )
        history.reverse()  # Oldest first

        # 4. Build COMPREHENSIVE user context - AI must be OMNISCIENT
        account_login = conversation.account_login

        # Core context
        user_context = ContextBuilder.build_user_context(user)
        account_context = ContextBuilder.build_account_context(user, account_login)

        # Critical context for answering questions
        breach_context = ContextBuilder.build_breach_context(user, account_login)
        payout_context = ContextBuilder.build_payout_context(user)

        # Extended context for complete knowledge
        event_logs_context = ContextBuilder.build_event_logs_context(user, account_login)
        trading_activity_context = ContextBuilder.build_trading_activity_context(user, account_login)
        account_metrics_context = ContextBuilder.build_account_metrics_context(user, account_login)
        kyc_context = ContextBuilder.build_kyc_context(user)
        soft_breaches_context = ContextBuilder.build_soft_breaches_context(user, account_login)
        support_history_context = ContextBuilder.build_support_history_context(user)
        order_history_context = ContextBuilder.build_order_history_context(user)

        # 5. Analyze emotional state with psychology-based assessment
        analyzer = get_emotional_analyzer()
        emotional_analysis = analyzer.analyze_message(user_message, history)
        # Use .get() with defaults to prevent KeyError
        result['emotional_level'] = emotional_analysis.get('level', 'calm')
        result['ai_can_resolve'] = emotional_analysis.get('ai_can_resolve', True)

        # 6. Check for immediate escalation (only for truly unresolvable situations)
        # NOTE: The AI will still attempt resolution for most cases, even difficult ones
        if emotional_analysis.get('should_escalate_immediately', False):
            result['escalated'] = True
            result['flagged_for_review'] = True

            # Update conversation status and DISABLE AI
            conversation.status = 'escalated'
            conversation.ai_enabled = False  # Disable AI on escalation
            conversation.needs_human_review = True
            emotional_level = emotional_analysis.get('level', 'unknown')
            indicators = emotional_analysis.get('indicators', [])
            conversation.escalation_reason = f"Emotional escalation: {emotional_level} - Indicators: {', '.join(indicators) if indicators else 'none'}"

            # Auto-assign to an on-shift support agent if not already assigned
            if not conversation.assigned_agent:
                support_agent = get_least_loaded_agent()
                if support_agent:
                    conversation.assigned_agent = support_agent
                else:
                    conversation.needs_human_review = True

            conversation.save(update_fields=[
                'status', 'ai_enabled', 'needs_human_review', 'escalation_reason',
                'assigned_agent', 'updated_at'
            ])

            # Generate boundary response for abusive messages
            ai_response = SupportChatService._generate_escalation_response(
                emotional_analysis, config
            )
            ai_msg = SupportChatService._save_ai_message(
                conversation, ai_response, emotional_analysis, {'escalated': True}
            )
            result['ai_response'] = SupportChatService._serialize_message(ai_msg)

            # Log event
            if request:
                log_event(
                    request=request,
                    user=user,
                    category='support',
                    event_type='conversation_escalated',
                    metadata={
                        'conversation_id': str(conversation.id),
                        'emotional_level': emotional_level,
                        'indicators': indicators,
                    },
                    description=f"Conversation escalated due to {emotional_level} language"
                )

            return result

        # 7. Build FAQ context
        faq_builder = get_faq_knowledge_builder()
        faq_context = faq_builder.build_context(
            user_query=user_message,
            max_articles=30,
            tiered_retrieval=True
        )

        # 8. Build system prompt with psychology-based emotional handling
        # Combine de-escalation context with resolution strategy
        emotional_context = emotional_analysis.get('deescalation_context', '')
        resolution_strategy = emotional_analysis.get('resolution_strategy', '')

        combined_emotional_context = ""
        if emotional_context:
            combined_emotional_context += emotional_context
        if resolution_strategy:
            combined_emotional_context += f"\n\n## RESOLUTION STRATEGY FOR THIS CUSTOMER\n{resolution_strategy}"

        # Detect categories for training example matching
        detected_categories = emotional_analysis.get('indicators', [])

        system_instruction = PromptBuilder.build_system_instruction(
            user_context=user_context,
            account_context=account_context,
            faq_context=faq_context,
            emotional_context=combined_emotional_context if combined_emotional_context else None,
            breach_context=breach_context if breach_context else None,
            payout_context=payout_context if payout_context else None,
            event_logs_context=event_logs_context if event_logs_context else None,
            trading_activity_context=trading_activity_context if trading_activity_context else None,
            account_metrics_context=account_metrics_context if account_metrics_context else None,
            kyc_context=kyc_context if kyc_context else None,
            soft_breaches_context=soft_breaches_context if soft_breaches_context else None,
            support_history_context=support_history_context if support_history_context else None,
            order_history_context=order_history_context if order_history_context else None,
            custom_system_prompt=config.ai_system_prompt or None,
            user_query=user_message,
            detected_categories=detected_categories,
        )

        # 9. Select model
        gemini = get_gemini_client()
        model_name = gemini.select_model(
            user_message,
            emotional_analysis.get('level', 'calm'),
            config
        )
        result['model_used'] = model_name

        # 10. Call Gemini API
        # Format conversation history for Gemini
        formatted_history = PromptBuilder.format_conversation_history(history[:-1])  # Exclude current message

        ai_result = gemini.generate_response(
            system_instruction=system_instruction,
            user_message=user_message,
            model_name=model_name,
            conversation_history=formatted_history if formatted_history else None,
        )

        # 10b. Detect truncated responses
        finish_reason = ai_result.get('finish_reason', '')
        if finish_reason in ('MAX_TOKENS', 'LENGTH'):
            logger.warning(
                "[SUPPORT AI] Response truncated (finish_reason=%s) for conversation %s",
                finish_reason, conversation.id,
            )
            conversation.needs_human_review = True
            conversation.save(update_fields=['needs_human_review', 'updated_at'])

        # 11. Validate response quality
        ai_response_text = ai_result.get('text', '') or ''
        quality_flags = SupportChatService._validate_response_quality(
            ai_response_text, user_message
        )

        if quality_flags.get('needs_review'):
            result['flagged_for_review'] = True
            conversation.needs_human_review = True
            conversation.save(update_fields=['needs_human_review', 'updated_at'])

        # Check for de-escalation
        if emotional_analysis.get('should_deescalate'):
            conversation.deescalation_attempted = True
            conversation.save(update_fields=['deescalation_attempted', 'updated_at'])

        # Flag for human review if AI cannot resolve or customer requested human
        if not emotional_analysis.get('ai_can_resolve', True):
            conversation.needs_human_review = True
            conversation.status = 'escalated'
            conversation.ai_enabled = False
            escalation_reason = emotional_analysis.get('escalation_reason', 'AI determined human assistance needed')
            if not conversation.escalation_reason:
                conversation.escalation_reason = escalation_reason

            # Auto-assign to an on-shift support agent if not already assigned
            if not conversation.assigned_agent:
                support_agent = get_least_loaded_agent()
                if support_agent:
                    conversation.assigned_agent = support_agent
                else:
                    conversation.needs_human_review = True

            conversation.save(update_fields=[
                'needs_human_review', 'escalation_reason', 'status',
                'ai_enabled', 'assigned_agent', 'updated_at'
            ])
            result['flagged_for_review'] = True
            result['escalated'] = True
            logger.info(f"Conversation {conversation.id} escalated with agent assignment: {escalation_reason}")

        # 12. Save AI response
        metadata = {
            'model_used': ai_result.get('model_used'),
            'finish_reason': ai_result.get('finish_reason'),
            'safety_ratings': ai_result.get('safety_ratings'),
            'quality_flags': quality_flags,
            'error': ai_result.get('error'),
        }

        ai_msg = SupportChatService._save_ai_message(
            conversation, ai_response_text, emotional_analysis, metadata
        )

        result['ai_response'] = SupportChatService._serialize_message(ai_msg)

        # Update first_response_at if this is the first AI response
        if not conversation.first_response_at:
            conversation.first_response_at = ai_msg.created_at
            conversation.save(update_fields=['first_response_at', 'updated_at'])

        return result

    @staticmethod
    def process_guest_message(
        conversation: SupportConversation,
        user_message: str,
        attachment: dict = None,
    ) -> dict:
        """
        Process a guest (unauthenticated) visitor message and generate AI response.

        Simplified flow — skips all user-specific context builders.
        Uses GUEST_CONTEXT_ADDENDUM + FAQ + emotional analysis + Gemini.
        """
        config = SupportAIConfig.get_config()

        # 1. Save user message (sender=None for guests)
        user_msg = SupportChatService._save_user_message(
            conversation, user_message, None, attachment
        )

        result = {
            'user_message': SupportChatService._serialize_message(user_msg),
            'ai_response': None,
            'escalated': False,
            'flagged_for_review': False,
            'emotional_level': 'calm',
            'model_used': None,
        }

        # 2. Check if AI is enabled
        if not config.ai_enabled or not conversation.ai_enabled:
            logger.info(f"AI disabled for guest conversation {conversation.id}")
            return result

        # 3. Get conversation history (last 20 messages)
        history = list(
            conversation.messages.filter(is_internal=False)
            .order_by('-created_at')[:20]
        )
        history.reverse()

        # 4. Build guest context (NO user-specific context builders)
        # Use .replace() instead of .format() to avoid KeyError/ValueError
        # if guest_name contains curly braces
        guest_context = (
            GUEST_CONTEXT_ADDENDUM
            .replace('{guest_name}', conversation.guest_name or 'Unknown')
            .replace('{guest_email}', conversation.guest_email or 'Unknown')
        )

        # 5. Analyze emotional state
        analyzer = get_emotional_analyzer()
        emotional_analysis = analyzer.analyze_message(user_message, history)
        result['emotional_level'] = emotional_analysis.get('level', 'calm')

        # 6. Check for immediate escalation
        if emotional_analysis.get('should_escalate_immediately', False):
            result['escalated'] = True
            result['flagged_for_review'] = True

            conversation.status = 'escalated'
            conversation.ai_enabled = False
            conversation.needs_human_review = True
            conversation.escalation_reason = (
                f"Guest escalation: {emotional_analysis.get('level', 'unknown')}"
            )

            if not conversation.assigned_agent:
                support_agent = get_least_loaded_agent()
                if support_agent:
                    conversation.assigned_agent = support_agent

            conversation.save(update_fields=[
                'status', 'ai_enabled', 'needs_human_review',
                'escalation_reason', 'assigned_agent', 'updated_at'
            ])

            ai_response = SupportChatService._generate_escalation_response(
                emotional_analysis, config
            )
            ai_msg = SupportChatService._save_ai_message(
                conversation, ai_response, emotional_analysis, {'escalated': True}
            )
            result['ai_response'] = SupportChatService._serialize_message(ai_msg)
            return result

        # 7. Build FAQ context
        faq_builder = get_faq_knowledge_builder()
        faq_context = faq_builder.build_context(
            user_query=user_message,
            max_articles=30,
            tiered_retrieval=True
        )

        # 8. Build system prompt with guest context instead of user context
        emotional_context = emotional_analysis.get('deescalation_context', '')
        resolution_strategy = emotional_analysis.get('resolution_strategy', '')
        combined_emotional_context = ""
        if emotional_context:
            combined_emotional_context += emotional_context
        if resolution_strategy:
            combined_emotional_context += f"\n\n## RESOLUTION STRATEGY\n{resolution_strategy}"

        detected_categories = emotional_analysis.get('indicators', [])

        system_instruction = PromptBuilder.build_system_instruction(
            user_context=guest_context,
            account_context="",
            faq_context=faq_context,
            emotional_context=combined_emotional_context or None,
            custom_system_prompt=config.ai_system_prompt or None,
            user_query=user_message,
            detected_categories=detected_categories,
        )

        # 9. Select model and call Gemini
        gemini = get_gemini_client()
        model_name = gemini.select_model(
            user_message,
            emotional_analysis.get('level', 'calm'),
            config
        )
        result['model_used'] = model_name

        formatted_history = PromptBuilder.format_conversation_history(history[:-1])

        ai_result = gemini.generate_response(
            system_instruction=system_instruction,
            user_message=user_message,
            model_name=model_name,
            conversation_history=formatted_history if formatted_history else None,
        )

        # 10. Validate and save
        ai_response_text = ai_result.get('text', '') or ''
        quality_flags = SupportChatService._validate_response_quality(
            ai_response_text, user_message
        )

        if quality_flags.get('needs_review'):
            result['flagged_for_review'] = True
            conversation.needs_human_review = True
            conversation.save(update_fields=['needs_human_review', 'updated_at'])

        if not emotional_analysis.get('ai_can_resolve', True):
            conversation.needs_human_review = True
            conversation.status = 'escalated'
            conversation.ai_enabled = False
            conversation.escalation_reason = emotional_analysis.get(
                'escalation_reason', 'AI determined human assistance needed'
            )
            if not conversation.assigned_agent:
                support_agent = get_least_loaded_agent()
                if support_agent:
                    conversation.assigned_agent = support_agent
            conversation.save(update_fields=[
                'needs_human_review', 'escalation_reason', 'status',
                'ai_enabled', 'assigned_agent', 'updated_at'
            ])
            result['flagged_for_review'] = True
            result['escalated'] = True

        metadata = {
            'model_used': ai_result.get('model_used'),
            'finish_reason': ai_result.get('finish_reason'),
            'safety_ratings': ai_result.get('safety_ratings'),
            'quality_flags': quality_flags,
            'error': ai_result.get('error'),
            'guest': True,
        }

        ai_msg = SupportChatService._save_ai_message(
            conversation, ai_response_text, emotional_analysis, metadata
        )
        result['ai_response'] = SupportChatService._serialize_message(ai_msg)

        if not conversation.first_response_at:
            conversation.first_response_at = ai_msg.created_at
            conversation.save(update_fields=['first_response_at', 'updated_at'])

        return result

    @staticmethod
    def _save_user_message(
        conversation: SupportConversation,
        content: str,
        user,
        attachment: Optional[dict] = None
    ) -> SupportMessage:
        """Save user message to database."""
        msg = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='user',
            sender=user,
            content=content,
            attachment_url=attachment.get('url') if attachment else None,
            attachment_name=attachment.get('name') if attachment else None,
            attachment_type=attachment.get('type') if attachment else None,
            attachment_scan_status=attachment.get('scan_status', 'pending') if attachment else 'pending',
        )

        # Auto-translate for CRM operators
        try:
            from api.support_translation import TranslationService
            result = TranslationService.detect_and_translate(content, target_lang="English")
            if result.get('needs_translation'):
                msg.metadata = msg.metadata or {}
                msg.metadata['original_content'] = result['original_content']
                msg.metadata['translated_content'] = result['translated_content']
                msg.metadata['detected_language'] = result['detected_language']
                msg.save(update_fields=['metadata'])

                # Store language on conversation for outbound translation
                conv_meta = conversation.metadata or {}
                if not conv_meta.get('detected_language'):
                    conv_meta['detected_language'] = result['detected_language']
                    conversation.metadata = conv_meta
                    conversation.save(update_fields=['metadata', 'updated_at'])
        except Exception:
            pass  # Never block message delivery

        return msg

    @staticmethod
    def _save_ai_message(
        conversation: SupportConversation,
        content: str,
        emotional_analysis: dict,
        metadata: dict,
    ) -> SupportMessage:
        """Save AI response to database."""
        msg = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='ai',
            sender=None,
            content=content,
            emotional_context=emotional_analysis,
            metadata=metadata,
        )
        return msg

    @staticmethod
    def _generate_escalation_response(emotional_analysis: dict, config) -> str:
        """Generate appropriate response for escalated conversations."""
        level = emotional_analysis.get('level', 'unknown') if emotional_analysis else 'unknown'
        escalation_reason = emotional_analysis.get('escalation_reason', '') if emotional_analysis else ''

        # Customer explicitly requested human agent (only after persistent requests)
        if 'requested human' in escalation_reason.lower() or 'customer requested' in escalation_reason.lower():
            return (
                "Absolutely! I've connected you with our support team. "
                "A human agent will join this conversation shortly to assist you. "
                "They'll have full context of our conversation. Thank you for your patience!"
            )
        elif level == 'abusive':
            return (
                "I understand you're frustrated, and I want to help. However, I'm unable to continue "
                "while receiving this type of language. I've flagged this conversation for our support team, "
                "who will review and respond to your concerns shortly. If you'd like to continue our chat "
                "constructively, I'm here to help."
            )
        elif level == 'threatening':
            return (
                "I understand you have serious concerns. I've escalated this conversation to our support team "
                "who can address these matters appropriately. For any formal disputes or legal matters, "
                "please contact us directly at support@we-fund.com. Someone will be in touch within 24 hours."
            )
        else:
            return (
                "I've connected you with our support team. "
                "A human agent will review this conversation and respond shortly."
            )

    @staticmethod
    def _validate_response_quality(response: str, question: str) -> dict:
        """
        Validate AI response quality.

        Checks:
        - Uncertainty phrases
        - Response relevance
        - Minimum length

        Returns:
            dict with quality flags and needs_review indicator
        """
        flags = {
            'has_uncertainty': False,
            'may_be_irrelevant': False,
            'too_short': False,
            'needs_review': False,
        }

        # Handle None/empty inputs safely
        if not response:
            response = ""
        if not question:
            question = ""

        response_lower = response.lower()

        # Check for uncertainty phrases
        uncertainty_phrases = [
            "i don't know",
            "i'm not sure",
            "i cannot find",
            "i don't have information",
            "i'm unable to",
            "i apologize, but i",
            "unfortunately, i don't",
        ]
        if any(phrase in response_lower for phrase in uncertainty_phrases):
            flags['has_uncertainty'] = True

        # Check response length
        if len(response) < 50:
            flags['too_short'] = True

        # Simple relevance check: do question keywords appear in response?
        question_words = set(question.lower().split())
        response_words = set(response_lower.split())
        common_words = question_words.intersection(response_words)

        # Filter out common stop words
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where', 'can', 'do', 'does', 'i', 'my', 'me', 'you', 'your'}
        meaningful_common = common_words - stop_words

        if len(question_words - stop_words) > 3 and len(meaningful_common) < 2:
            flags['may_be_irrelevant'] = True

        # Set needs_review if any significant flags
        if flags['has_uncertainty'] or flags['may_be_irrelevant']:
            flags['needs_review'] = True

        return flags

    @staticmethod
    def _serialize_message(msg: SupportMessage) -> dict:
        """Serialize message for response."""
        return {
            'id': str(msg.id) if msg.id else None,
            'conversation_id': str(msg.conversation_id) if msg.conversation_id else None,
            'sender_type': msg.sender_type,
            'content': msg.content,
            'metadata': msg.metadata or {},
            'attachment_url': msg.attachment_url,
            'attachment_name': msg.attachment_name,
            'attachment_type': msg.attachment_type,
            'created_at': msg.created_at.isoformat() if msg.created_at else None,
        }

    @staticmethod
    def export_conversation_text(conversation: SupportConversation) -> str:
        """
        Export conversation as formatted text.

        Args:
            conversation: SupportConversation instance

        Returns:
            str: Formatted text export
        """
        messages = conversation.messages.filter(is_internal=False).order_by('created_at')

        # Safely get user email
        user_email = 'Unknown'
        if conversation.user and conversation.user.email:
            user_email = conversation.user.email

        # Safely format dates
        started_str = conversation.created_at.strftime('%Y-%m-%d %H:%M:%S') if conversation.created_at else 'Unknown'

        lines = [
            "=" * 60,
            "WEFUND SUPPORT CONVERSATION EXPORT",
            "=" * 60,
            f"Conversation ID: {conversation.id}",
            f"User: {user_email}",
            f"Started: {started_str}",
            f"Status: {conversation.status or 'Unknown'}",
            "=" * 60,
            "",
        ]

        for msg in messages:
            timestamp = msg.created_at.strftime('%Y-%m-%d %H:%M:%S') if msg.created_at else 'Unknown'
            sender = {
                'user': 'You',
                'ai': 'AI Assistant',
                'agent': f'Agent ({msg.sender.get_full_name() if msg.sender else "Unknown"})',
            }.get(msg.sender_type, msg.sender_type or 'Unknown')

            lines.append(f"[{timestamp}] {sender}:")
            lines.append(msg.content or '[No content]')

            if msg.attachment_url:
                lines.append(f"[Attachment: {msg.attachment_name}]")

            lines.append("")

        lines.append("=" * 60)
        lines.append("END OF CONVERSATION")
        lines.append("=" * 60)

        return "\n".join(lines)


# ===================================================================
# FAQ SEARCH SERVICE
# ===================================================================

class FAQSearchService:
    """
    Service for FAQ search and analytics tracking.
    """

    @staticmethod
    def search_articles(query: str, limit: int = 10) -> list:
        """
        Search FAQ articles.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            list of article dicts with relevance scores
        """
        builder = get_faq_knowledge_builder()
        return builder.search(query, limit)

    @staticmethod
    def track_article_view(article_id: str) -> bool:
        """
        Increment article view count.

        Args:
            article_id: UUID of article

        Returns:
            bool: Success status
        """
        from wefund.models import FAQArticle
        from django.db.models import F

        try:
            FAQArticle.objects.filter(id=article_id).update(
                views_count=F('views_count') + 1
            )
            return True
        except Exception as e:
            logger.error(f"Error tracking article view: {e}")
            return False

    @staticmethod
    def track_article_helpful(article_id: str, helpful: bool) -> bool:
        """
        Track article helpfulness feedback.

        Args:
            article_id: UUID of article
            helpful: True if helpful, False if not helpful

        Returns:
            bool: Success status
        """
        from wefund.models import FAQArticle
        from django.db.models import F

        try:
            if helpful:
                FAQArticle.objects.filter(id=article_id).update(
                    helpful_count=F('helpful_count') + 1
                )
            else:
                FAQArticle.objects.filter(id=article_id).update(
                    not_helpful_count=F('not_helpful_count') + 1
                )
            return True
        except Exception as e:
            logger.error(f"Error tracking article helpfulness: {e}")
            return False
