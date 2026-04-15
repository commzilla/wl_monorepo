"""
Admin AI Assistant — Orchestration Service.
Handles message processing, SSE streaming, tool call loops, and confirmation flow.
"""
import json
import logging
from typing import Optional, Generator

from django.db import transaction
from django.utils import timezone

from wefund.models import (
    AdminAIConfig,
    AdminAIConversation,
    AdminAIMessage,
)
from api.admin_ai import (
    get_admin_ai_client,
    AdminAIComplexityScorer,
    AdminAIPromptBuilder,
    AdminAIToolRegistry,
)
from api.admin_ai_tools import AdminAIToolExecutor
from api.admin_ai_training import AdminAITrainingService

logger = logging.getLogger(__name__)


class AdminAIChatService:
    """
    Main orchestration service for admin AI chat.
    """

    MAX_TOOL_CALL_ROUNDS = 5  # Max sequential tool call rounds to prevent infinite loops
    MAX_WRITE_OPS_PER_STREAM = 1  # Max write tool executions per stream (safety cap)

    @classmethod
    def stream_message(
        cls,
        conversation: AdminAIConversation,
        message: str,
        context_url: str,
        admin_user,
    ) -> Generator[str, None, None]:
        """
        Process an admin message and stream the AI response via SSE events.

        SSE Event Types:
        - token: AI response text chunk
        - tool_call: AI requesting a tool execution
        - tool_result: Result of tool execution
        - confirmation_required: Write action needs admin confirmation
        - done: Stream complete
        - error: Error occurred

        Yields:
            str: SSE-formatted event strings
        """
        config = AdminAIConfig.get_config()

        # 0. Concurrent stream protection — prevent two streams on the same conversation
        from django.core.cache import cache
        stream_lock_key = f"admin_ai_stream:{conversation.id}"
        if not cache.add(stream_lock_key, "1", timeout=300):
            yield cls._format_event('error', {"message": "Another stream is already active for this conversation. Please wait."})
            yield cls._format_event('done', {})
            return

        try:
            yield from cls._stream_message_inner(conversation, message, context_url, admin_user, config, stream_lock_key)
        finally:
            cache.delete(stream_lock_key)

    @classmethod
    def _stream_message_inner(cls, conversation, message, context_url, admin_user, config, stream_lock_key):
        # 1. Check if AI is enabled
        if not config.ai_enabled:
            yield cls._format_event('error', {"message": "Admin AI Assistant is currently disabled."})
            yield cls._format_event('done', {})
            return

        # 2. Save admin message
        admin_msg = AdminAIMessage.objects.create(
            conversation=conversation,
            role='admin',
            content=message,
        )

        # 3. Score complexity
        complexity_score = AdminAIComplexityScorer.score(message)

        # 4. Select model tier
        gemini = get_admin_ai_client()
        if not gemini.is_available:
            yield cls._format_event('error', {"message": "Gemini AI client is not available. Check API key configuration."})
            yield cls._format_event('done', {})
            return

        model_name = gemini.select_model(complexity_score, config)

        # 5. Detect context from URL
        context_type, context_data = cls._detect_context(context_url)

        # 6. Build FAQ context
        faq_context = cls._build_faq_context(message)

        # 7. Get training examples
        training_examples = AdminAITrainingService.get_relevant_examples(message)

        # 8. Build system prompt
        system_instruction = AdminAIPromptBuilder.build_system_instruction(
            config=config,
            context_type=context_type,
            context_data=context_data,
            faq_context=faq_context,
            training_examples=training_examples,
            custom_prompt=config.ai_system_prompt or None,
        )

        # 9. Build tool declarations (write tools only for admin-role users)
        tools = AdminAIToolRegistry.get_tools_for_config(config, admin_user=admin_user)

        # 10. Get conversation history
        history_msgs = list(
            conversation.messages.filter(role__in=['admin', 'ai'])
            .order_by('-created_at')[:20]
        )
        history_msgs.reverse()
        formatted_history = AdminAIPromptBuilder.format_conversation_history(history_msgs[:-1])

        # 11. Call Gemini
        ai_result = gemini.generate_response(
            system_instruction=system_instruction,
            user_message=message,
            model_name=model_name,
            conversation_history=formatted_history if formatted_history else None,
            tools=tools if tools else None,
            temperature=float(config.temperature),
            max_tokens=config.max_tokens,
        )

        # 12. Handle tool call loop
        tool_call_round = 0
        write_ops_executed = 0  # Safety counter for write operations
        while ai_result.get('tool_calls') and tool_call_round < cls.MAX_TOOL_CALL_ROUNDS:
            tool_call_round += 1
            tool_msg_ids = []  # Track saved message IDs for this round

            for tool_call in ai_result['tool_calls']:
                tool_name = tool_call['name']
                tool_args = tool_call['args']

                # Emit tool_call event (always redact sensitive params)
                yield cls._format_event('tool_call', {
                    "name": tool_name,
                    "args": cls._redact_params(tool_args),
                })

                # Safety cap: limit write operations per stream
                is_write = tool_name in AdminAIToolExecutor.WRITE_TOOLS
                if is_write and write_ops_executed >= cls.MAX_WRITE_OPS_PER_STREAM:
                    yield cls._format_event('tool_result', {
                        "name": tool_name,
                        "success": False,
                        "data": {},
                        "error": "Write operation limit reached for this message. Please send a new message.",
                    })
                    continue

                # Execute tool
                tool_result = AdminAIToolExecutor.execute_tool(
                    tool_name=tool_name,
                    params=tool_args,
                    admin_user=admin_user,
                    config=config,
                )

                # Track write ops
                if is_write and tool_result.get('success'):
                    write_ops_executed += 1

                # Check if confirmation is needed
                if tool_result.get('needs_confirmation'):
                    # Store ORIGINAL params — needed for execution on confirmation.
                    # Params are redacted after execution completes (or on cancel).
                    pending_msg = AdminAIMessage.objects.create(
                        conversation=conversation,
                        role='system',
                        content=f"Confirmation required: {tool_result.get('action_description', tool_name)}",
                        action_executed=tool_name,
                        action_params=tool_args,
                        action_status='pending_confirmation',
                        model_used=model_name,
                        complexity_score=complexity_score,
                    )

                    # SSE event: always send REDACTED params to the client
                    yield cls._format_event('confirmation_required', {
                        "message_id": str(pending_msg.id),
                        "tool_name": tool_name,
                        "params": cls._redact_params(tool_args),
                        "description": tool_result.get('action_description', ''),
                    })
                    yield cls._format_event('done', {"model_used": model_name, "complexity_score": complexity_score})
                    return

                # Emit tool_result event
                yield cls._format_event('tool_result', {
                    "name": tool_name,
                    "success": tool_result.get('success', False),
                    "data": tool_result.get('data', {}),
                    "error": tool_result.get('error'),
                })

                # Save tool execution as system message and track for follow-up
                tool_sys_msg = AdminAIMessage.objects.create(
                    conversation=conversation,
                    role='system',
                    content=f"Tool: {tool_name}",
                    action_executed=tool_name,
                    action_params=cls._redact_params(tool_args),
                    action_result=tool_result.get('data'),
                    action_status='success' if tool_result.get('success') else 'error',
                )
                tool_msg_ids.append(tool_sys_msg.id)

            # Build aggregated tool response to send back to Gemini
            tool_results_summary = []
            tool_msgs = AdminAIMessage.objects.filter(id__in=tool_msg_ids).order_by('created_at')
            for tc_msg in tool_msgs:
                tc_data = tc_msg.action_result if tc_msg.action_result else {}
                tool_results_summary.append(f"{tc_msg.action_executed}: {json.dumps(tc_data)}")

            follow_up_message = (
                f"Original question: {message}\n\n"
                f"Tool results:\n" + "\n".join(tool_results_summary)
            )

            ai_result = gemini.generate_response(
                system_instruction=system_instruction,
                user_message=follow_up_message,
                model_name=model_name,
                conversation_history=None,
                tools=tools if tools else None,
                temperature=float(config.temperature),
                max_tokens=config.max_tokens,
            )

        # 13. Emit final AI response
        ai_text = ai_result.get('text', '') or ''

        if ai_text:
            yield cls._format_event('token', {"text": ai_text})

        # 14. Save AI response
        ai_msg = AdminAIMessage.objects.create(
            conversation=conversation,
            role='ai',
            content=ai_text,
            model_used=model_name,
            complexity_score=complexity_score,
            metadata={
                'finish_reason': ai_result.get('finish_reason'),
                'error': ai_result.get('error'),
                'tool_call_rounds': tool_call_round,
            },
        )

        # 15. Emit done event
        yield cls._format_event('done', {
            "message_id": str(ai_msg.id),
            "model_used": model_name,
            "complexity_score": complexity_score,
        })

    @classmethod
    def process_confirmation(
        cls,
        conversation: AdminAIConversation,
        message_id: str,
        confirmed: bool,
        admin_user,
    ) -> dict:
        """
        Handle confirmation or cancellation of a pending write action.

        Returns:
            dict: {success, action_result, message}
        """
        # Use transaction + select_for_update to prevent double-execution of write actions
        with transaction.atomic():
            try:
                pending_msg = AdminAIMessage.objects.select_for_update().get(
                    id=message_id,
                    conversation=conversation,
                    action_status='pending_confirmation',
                )
            except AdminAIMessage.DoesNotExist:
                return {"success": False, "error": "Pending confirmation not found or already processed."}

            if not confirmed:
                pending_msg.action_status = 'cancelled'
                pending_msg.action_params = cls._redact_params(pending_msg.action_params or {})
                pending_msg.save(update_fields=['action_status', 'action_params'])

                AdminAIMessage.objects.create(
                    conversation=conversation,
                    role='system',
                    content=f"Action cancelled: {pending_msg.action_executed}",
                    action_executed=pending_msg.action_executed,
                    action_status='cancelled',
                )

                return {"success": True, "message": "Action cancelled."}

            # Mark as processing before executing to prevent double-execution
            pending_msg.action_status = 'processing'
            pending_msg.save(update_fields=['action_status'])

        # Execute outside the lock (MT5 calls may be slow)
        tool_result = AdminAIToolExecutor.execute_confirmed_tool(
            tool_name=pending_msg.action_executed,
            params=pending_msg.action_params or {},
            admin_user=admin_user,
        )

        # Update with final result — redact sensitive params now that execution is complete
        pending_msg.action_result = tool_result.get('data')
        pending_msg.action_status = 'success' if tool_result.get('success') else 'error'
        pending_msg.action_params = cls._redact_params(pending_msg.action_params or {})
        pending_msg.save(update_fields=['action_result', 'action_status', 'action_params'])

        # Create result message
        result_content = (
            f"Action completed: {pending_msg.action_executed}"
            if tool_result.get('success')
            else f"Action failed: {tool_result.get('error', 'Unknown error')}"
        )

        AdminAIMessage.objects.create(
            conversation=conversation,
            role='system',
            content=result_content,
            action_executed=pending_msg.action_executed,
            action_result=tool_result.get('data'),
            action_status='success' if tool_result.get('success') else 'error',
        )

        return {
            "success": tool_result.get('success', False),
            "action_result": tool_result,
            "message": result_content,
        }

    # ===================================================================
    # HELPERS
    # ===================================================================

    @classmethod
    def _detect_context(cls, context_url: str) -> tuple:
        """
        Detect CRM page context from URL.

        Returns:
            tuple: (context_type, context_data)
        """
        if not context_url:
            return 'general', {}

        context_type = 'general'
        context_data = {}
        url_lower = context_url.lower()

        # Detect context type from URL patterns
        if '/enrollment' in url_lower or '/challenge-enrollment' in url_lower:
            context_type = 'enrollment'
        elif '/trader' in url_lower:
            context_type = 'trader'
        elif '/payout' in url_lower:
            context_type = 'payout'
        elif '/order' in url_lower:
            context_type = 'order'

        context_data['page_url'] = context_url

        return context_type, context_data

    @classmethod
    def _build_faq_context(cls, message: str) -> Optional[str]:
        """Build FAQ context for the message."""
        try:
            from api.support_faq_knowledge import get_faq_knowledge_builder
            builder = get_faq_knowledge_builder()
            return builder.build_context(
                user_query=message,
                max_articles=15,
                tiered_retrieval=True,
            )
        except Exception as e:
            logger.warning(f"Error building FAQ context: {e}")
            return None

    # Fields that must never be persisted to the database
    SENSITIVE_PARAM_KEYS = {'new_password', 'password', 'investor_password', 'main_password'}

    @classmethod
    def _redact_params(cls, params: dict) -> dict:
        """Return a copy of params with sensitive fields redacted."""
        if not params:
            return params
        redacted = dict(params)
        for key in cls.SENSITIVE_PARAM_KEYS:
            if key in redacted:
                redacted[key] = '***REDACTED***'
        return redacted

    @staticmethod
    def _format_event(event_type: str, data: dict) -> str:
        """Format an SSE event string."""
        payload = {"type": event_type, **data}
        return f"data: {json.dumps(payload)}\n\n"
