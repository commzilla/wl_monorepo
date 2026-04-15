"""
Admin AI Assistant — Core AI Engine.
Gemini client, complexity scoring, prompt building, and tool registry.
"""
import logging
import json
from typing import Optional, List, Dict
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# ===================================================================
# COMPLEXITY SCORER
# ===================================================================

class AdminAIComplexityScorer:
    """
    Scores admin messages on a 1-7 complexity scale for model tier selection.

    1-3: Simple (flash-lite) — greetings, simple FAQ, single lookups
    4-5: Standard (flash) — multi-field lookups, comparisons, moderate reasoning
    6-7: Pro (pro) — MT5 write ops, multi-step analysis, cross-entity reasoning
    """

    DATA_LOOKUP_KEYWORDS = {
        'enrollment', 'trader', 'payout', 'account', 'mt5', 'balance',
        'equity', 'trade', 'breach', 'kyc', 'order', 'snapshot',
        'drawdown', 'profit', 'loss', 'metrics', 'history', 'status',
    }

    MT5_WRITE_KEYWORDS = {
        'deposit', 'withdraw', 'withdrawal', 'activate', 'disable',
        'enable', 'close trades', 'close all', 'change password',
        'change group', 'reset', 'move group',
    }

    MULTI_STEP_INDICATORS = {
        'compare', 'between', 'versus', 'difference', 'analyze',
        'investigate', 'check all', 'look into', 'summary of',
        'overview', 'report', 'why did', 'explain why', 'correlate',
    }

    @classmethod
    def score(cls, message: str) -> int:
        """
        Score message complexity from 1 to 7.

        Returns:
            int: Complexity score
        """
        if not message:
            return 1

        message_lower = message.lower()
        score = 1

        # Length factor
        length = len(message)
        if length > 300:
            score += 2
        elif length > 150:
            score += 1

        # Question count
        question_marks = message.count('?')
        if question_marks > 2:
            score += 2
        elif question_marks > 1:
            score += 1

        # Data lookup keywords
        lookup_count = sum(1 for kw in cls.DATA_LOOKUP_KEYWORDS if kw in message_lower)
        if lookup_count >= 3:
            score += 2
        elif lookup_count >= 1:
            score += 1

        # MT5 write operation keywords
        write_count = sum(1 for kw in cls.MT5_WRITE_KEYWORDS if kw in message_lower)
        if write_count >= 1:
            score += 2

        # Multi-step reasoning indicators
        multi_count = sum(1 for kw in cls.MULTI_STEP_INDICATORS if kw in message_lower)
        if multi_count >= 2:
            score += 2
        elif multi_count >= 1:
            score += 1

        return min(score, 7)


# ===================================================================
# TOOL REGISTRY — Gemini Function Calling Schemas
# ===================================================================

class AdminAIToolRegistry:
    """
    Declares all Gemini function-calling tool schemas for the admin AI.
    """

    @classmethod
    def get_read_tools(cls) -> list:
        """Return Gemini function declarations for read operations."""
        return [
            {
                "name": "lookup_enrollment",
                "description": "Look up a challenge enrollment by ID or MT5 account ID. Returns enrollment details, status, challenge info, and account size.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "enrollment_id": {"type": "string", "description": "UUID of the enrollment"},
                        "mt5_account_id": {"type": "string", "description": "MT5 account login number"},
                    },
                },
            },
            {
                "name": "lookup_trader",
                "description": "Look up a trader/user by email, user ID, or name. Returns profile info, enrollments, and account details.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string", "description": "Trader's email address"},
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "name": {"type": "string", "description": "Trader's name (partial match)"},
                    },
                },
            },
            {
                "name": "lookup_payout",
                "description": "Look up a payout by ID or by trader email. Returns payout details, status, amount, and review info.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "payout_id": {"type": "string", "description": "UUID of the payout"},
                        "trader_email": {"type": "string", "description": "Trader's email to find their payouts"},
                    },
                },
            },
            {
                "name": "get_mt5_account_details",
                "description": "Get full MT5 account details from the MT5 server (live data). Includes balance, equity, group, permissions, leverage.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "get_mt5_open_trades",
                "description": "Get currently open trades for an MT5 account (live data from MT5 server).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "get_breach_history",
                "description": "Get breach history for a trader or specific enrollment. Shows why accounts failed with rule, reason, date, and equity at breach.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "enrollment_id": {"type": "string", "description": "UUID of the enrollment"},
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "mt5_account_id": {"type": "string", "description": "MT5 account login number"},
                    },
                },
            },
            {
                "name": "get_breach_statistics",
                "description": "Get aggregate breach statistics across all accounts. Shows most common breach types, counts, and breakdowns by phase. Useful for questions like 'most common breach type' or 'how many breaches this month'.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phase": {"type": "string", "description": "Filter by enrollment phase: phase_1, phase_2, live, or all (default: all)"},
                        "days": {"type": "integer", "description": "Number of days to look back (default: 30, max: 365)"},
                        "limit": {"type": "integer", "description": "Max breach types to return (default: 10)"},
                    },
                },
            },
            {
                "name": "get_trade_history",
                "description": "Get recent closed trades for an MT5 account from the database.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                        "limit": {"type": "integer", "description": "Max trades to return (default 20)"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "get_account_metrics",
                "description": "Get current account metrics (balance, equity, drawdown, profit) from daily snapshots.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "enrollment_id": {"type": "string", "description": "UUID of the enrollment"},
                        "mt5_account_id": {"type": "string", "description": "MT5 account login number"},
                    },
                },
            },
            {
                "name": "get_kyc_status",
                "description": "Get KYC verification status for a trader.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "email": {"type": "string", "description": "Trader's email address"},
                    },
                },
            },
            {
                "name": "get_order_history",
                "description": "Get purchase/order history for a trader.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "email": {"type": "string", "description": "Trader's email address"},
                        "limit": {"type": "integer", "description": "Max orders to return (default 10)"},
                    },
                },
            },
            {
                "name": "get_event_logs",
                "description": "Get event log audit trail for a user (system events, actions taken). Accepts user_id or email.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "email": {"type": "string", "description": "Email address of the user (resolved to user_id automatically)"},
                        "limit": {"type": "integer", "description": "Max events to return (default 30)"},
                    },
                },
            },
            {
                "name": "get_soft_breaches",
                "description": "Get soft breaches (warnings) for a trader or account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "UUID of the user"},
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                },
            },
            {
                "name": "get_payout_config",
                "description": "Get payout configuration for an enrollment (split percentage, caps, etc.).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "enrollment_id": {"type": "string", "description": "UUID of the enrollment"},
                    },
                    "required": ["enrollment_id"],
                },
            },
            {
                "name": "search_traders",
                "description": "Search for traders by partial name, email, or MT5 account ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query (name, email, or account ID)"},
                        "limit": {"type": "integer", "description": "Max results (default 10)"},
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "get_enrollment_snapshots",
                "description": "Get daily performance snapshots for an enrollment.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "enrollment_id": {"type": "string", "description": "UUID of the enrollment"},
                        "days": {"type": "integer", "description": "Number of recent days (default 7)"},
                    },
                    "required": ["enrollment_id"],
                },
            },
            {
                "name": "get_consistency_report",
                "description": "Get the Risk Engine v2 consistency scan report for a payout. Returns global score, max severity, recommended action, scan window, and full list of violations (rule name, severity, affected P&L, description, trade metadata).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "payout_id": {"type": "string", "description": "UUID of the payout"},
                    },
                    "required": ["payout_id"],
                },
            },
        ]

    @classmethod
    def get_write_tools(cls) -> list:
        """Return Gemini function declarations for write operations."""
        return [
            {
                "name": "mt5_deposit",
                "description": "Deposit funds into an MT5 account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                        "amount": {"type": "number", "description": "Amount to deposit (positive number)"},
                        "comment": {"type": "string", "description": "Deposit comment/reason"},
                    },
                    "required": ["account_id", "amount"],
                },
            },
            {
                "name": "mt5_withdraw",
                "description": "Withdraw funds from an MT5 account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                        "amount": {"type": "number", "description": "Amount to withdraw (positive number)"},
                        "comment": {"type": "string", "description": "Withdrawal comment/reason"},
                    },
                    "required": ["account_id", "amount"],
                },
            },
            {
                "name": "mt5_activate_trading",
                "description": "Enable trading for an MT5 account (canTrade=True).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "mt5_disable_trading",
                "description": "Disable trading for an MT5 account (canTrade=False).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "mt5_enable_account",
                "description": "Enable an MT5 account (isEnabled=True).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "mt5_disable_account",
                "description": "Disable an MT5 account (isEnabled=False).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "mt5_close_trades",
                "description": "Close all open trades for an MT5 account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                    },
                    "required": ["account_id"],
                },
            },
            {
                "name": "mt5_change_password",
                "description": "Change the password for an MT5 account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                        "new_password": {"type": "string", "description": "New password"},
                        "mode": {"type": "string", "description": "Password type: 'main', 'investor', or 'both'", "enum": ["main", "investor", "both"]},
                    },
                    "required": ["account_id", "new_password"],
                },
            },
            {
                "name": "mt5_change_group",
                "description": "Change the MT5 group for an account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "integer", "description": "MT5 account login number"},
                        "new_group": {"type": "string", "description": "New MT5 group name"},
                    },
                    "required": ["account_id", "new_group"],
                },
            },
        ]

    @classmethod
    def get_tools_for_config(cls, config, admin_user=None) -> list:
        """
        Get tool declarations filtered by config permissions and user role.
        Empty allowed list = NO tools permitted (safe default).
        Write tools are only included for admin-role users.
        """
        tools = []

        if config.read_actions_enabled:
            allowed = config.allowed_read_actions or []
            for tool in cls.get_read_tools():
                if tool['name'] in allowed:
                    tools.append(tool)

        # Write tools only available to admin-role users
        user_role = getattr(admin_user, 'role', None) if admin_user else None
        if config.write_actions_enabled and user_role == 'admin':
            allowed = config.allowed_write_actions or []
            for tool in cls.get_write_tools():
                if tool['name'] in allowed:
                    tools.append(tool)

        return tools


# ===================================================================
# PROMPT BUILDER
# ===================================================================

class AdminAIPromptBuilder:
    """
    Builds system prompt for the admin AI assistant.
    """

    BASE_SYSTEM_PROMPT = """You are WeFund's internal Admin AI Assistant — a powerful tool for CRM administrators.
You help admin staff look up data, execute MT5 operations, and answer policy/rule questions.

## YOUR CAPABILITIES
- **Data Lookups**: Enrollments, traders, payouts, MT5 accounts, breaches, trades, KYC, orders, event logs
- **MT5 Operations**: Deposit, withdraw, enable/disable trading, enable/disable account, close trades, change password, change group
- **Policy Knowledge**: Complete knowledge of all WeFund trading rules, programs, and policies
- **Context Awareness**: You know which CRM page the admin is currently viewing

## CRITICAL INSTRUCTIONS

1. **Use tools for data lookups** — Never guess or fabricate data. Always call the appropriate tool to fetch real data.
2. **Be precise with numbers** — Admins depend on accurate figures for account balances, equity, drawdown, etc.
3. **Confirm before write operations** — When asked to perform MT5 write operations, clearly state what you will do and wait for confirmation if required.
4. **Cite sources** — When presenting data, mention where it came from (e.g., "From the enrollment record..." or "According to MT5 live data...").
5. **Use markdown formatting** — Tables, bold, code blocks for account IDs, etc.
6. **Be concise but thorough** — Admins want quick answers with all relevant details.
7. **Never expose sensitive data inappropriately** — Passwords should be shown only when explicitly requested.

## BEHAVIOR
- You are an internal tool, not a customer-facing chatbot
- Be direct and efficient — no need for excessive pleasantries
- If you cannot find data, say so clearly and suggest alternative lookups
- For write operations, always confirm the action details before executing
- If an operation fails, explain the error clearly and suggest next steps

## LIMITATIONS
- You can only access data through the provided tools
- Write operations may be disabled or require confirmation based on admin configuration
- You cannot access external systems beyond MT5 and the WeFund database
"""

    @classmethod
    def build_system_instruction(
        cls,
        config,
        context_type: str = 'general',
        context_data: Optional[dict] = None,
        faq_context: Optional[str] = None,
        training_examples: Optional[list] = None,
        custom_prompt: Optional[str] = None,
    ) -> str:
        """
        Build complete system instruction for Gemini.

        Args:
            config: AdminAIConfig instance
            context_type: Type of CRM page context
            context_data: Pre-loaded context data for the current page
            faq_context: FAQ knowledge base content
            training_examples: Formatted training examples
            custom_prompt: Additional custom prompt from config

        Returns:
            str: Complete system instruction
        """
        from api.support_ai import CORE_RULES_KNOWLEDGE

        # Always include the base system prompt; append custom instructions if set
        sections = [cls.BASE_SYSTEM_PROMPT]
        if custom_prompt:
            sections.append(f"\n--- Additional Admin Instructions ---\n{custom_prompt}")

        # Include core trading rules knowledge
        sections.append(CORE_RULES_KNOWLEDGE)

        # Context-specific instructions
        if context_type != 'general' and context_data:
            sections.append(cls._build_context_section(context_type, context_data))

        # FAQ context
        if faq_context:
            sections.append(f"\n## FAQ KNOWLEDGE BASE\n{faq_context}")

        # Training examples
        if training_examples:
            sections.append(cls._format_training_examples(training_examples))

        # Tool usage instructions
        sections.append("""
## TOOL USAGE INSTRUCTIONS
- When asked to look up data, use the appropriate tool function
- Present results in a clear, formatted manner
- For MT5 write operations, always confirm details before execution
- If a tool call fails, explain the error and suggest alternatives
- You can chain multiple tool calls to gather comprehensive information
""")

        return "\n".join(sections)

    @classmethod
    def _build_context_section(cls, context_type: str, context_data: dict) -> str:
        """Build context section based on the CRM page type."""
        section = f"\n## CURRENT CRM CONTEXT: {context_type.upper()}\n"
        section += "The admin is currently viewing this data. Use it to provide contextual help.\n\n"

        for key, value in context_data.items():
            if value:
                section += f"**{key}**: {value}\n"

        return section

    @classmethod
    def _format_training_examples(cls, examples: list) -> str:
        """Format training examples for prompt injection."""
        if not examples:
            return ""

        sections = [
            "\n## LEARNED RESPONSES FROM ADMIN FEEDBACK",
            "Use these approved examples to guide your response style:\n"
        ]

        for i, ex in enumerate(examples, 1):
            sections.append(f"**Example {i}**")
            sections.append(f"Question: {ex.get('question', '')}")
            sections.append(f"Response: {ex.get('response', '')}")
            sections.append("")

        return "\n".join(sections)

    @classmethod
    def format_conversation_history(cls, messages) -> list:
        """
        Format conversation history for Gemini chat.

        Args:
            messages: QuerySet or list of AdminAIMessage instances

        Returns:
            list: Formatted history for Gemini
        """
        history = []
        for msg in messages:
            content = msg.content if msg.content else ""
            if not content:
                continue
            role = "user" if msg.role == "admin" else "model"
            history.append({
                "role": role,
                "parts": [content]
            })
        return history


# ===================================================================
# GEMINI CLIENT
# ===================================================================

class AdminAIGeminiClient:
    """
    Gemini API client for admin AI assistant.
    Supports 3-tier model selection and function calling.
    """

    def __init__(self):
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the Gemini client."""
        api_key = getattr(settings, 'GOOGLE_API_KEY', '')
        if not api_key:
            logger.warning("GOOGLE_API_KEY not configured. Admin AI will be disabled.")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._client = genai
            logger.info("Admin AI Gemini client initialized")
        except ImportError:
            logger.error("google-generativeai package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")

    @property
    def is_available(self):
        return self._client is not None

    def select_model(self, complexity_score: int, config) -> str:
        """
        Select model tier based on complexity score.

        Args:
            complexity_score: 1-7 complexity score
            config: AdminAIConfig instance

        Returns:
            str: Model name
        """
        if complexity_score >= config.complexity_threshold_pro:
            return config.pro_model
        elif complexity_score >= config.complexity_threshold_standard:
            return config.standard_model
        else:
            return config.simple_model

    def generate_response(
        self,
        system_instruction: str,
        user_message: str,
        model_name: str,
        conversation_history: Optional[list] = None,
        tools: Optional[list] = None,
        temperature: float = 0.4,
        max_tokens: int = 4096,
    ) -> dict:
        """
        Generate AI response with optional function calling.

        Returns:
            dict: {text, model_used, tool_calls, finish_reason, error}
        """
        if not self.is_available:
            return {
                "text": "Admin AI is not available. GOOGLE_API_KEY may not be configured.",
                "model_used": None,
                "tool_calls": [],
                "error": "Gemini client not initialized",
            }

        try:
            # Build tool config for Gemini
            gemini_tools = None
            if tools:
                gemini_tools = [
                    self._client.types.Tool(
                        function_declarations=[
                            self._client.types.FunctionDeclaration(
                                name=t['name'],
                                description=t['description'],
                                parameters=t.get('parameters'),
                            )
                            for t in tools
                        ]
                    )
                ]

            model = self._client.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                generation_config={
                    "temperature": temperature,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": max_tokens,
                },
                tools=gemini_tools,
            )

            if conversation_history:
                chat = model.start_chat(history=conversation_history)
                response = chat.send_message(user_message)
            else:
                response = model.generate_content(user_message)

            return self._parse_response(response, model_name)

        except Exception as e:
            logger.error(f"Admin AI Gemini API error: {e}")
            return {
                "text": "I encountered an error processing your request. Please try again.",
                "model_used": model_name,
                "tool_calls": [],
                "error": "Gemini API error",
            }

    def generate_with_tool_result(
        self,
        system_instruction: str,
        model_name: str,
        chat_history: list,
        tool_response_parts: list,
        tools: Optional[list] = None,
        temperature: float = 0.4,
        max_tokens: int = 4096,
    ) -> dict:
        """
        Continue generation after providing tool results back to Gemini.

        Args:
            system_instruction: System prompt
            model_name: Model to use
            chat_history: Full conversation history including the tool call
            tool_response_parts: Tool response parts to send back
            tools: Tool declarations
            temperature: Temperature setting
            max_tokens: Max output tokens

        Returns:
            dict: Parsed response
        """
        if not self.is_available:
            return {
                "text": "Admin AI is not available.",
                "model_used": None,
                "tool_calls": [],
                "error": "Client not initialized",
            }

        try:
            gemini_tools = None
            if tools:
                gemini_tools = [
                    self._client.types.Tool(
                        function_declarations=[
                            self._client.types.FunctionDeclaration(
                                name=t['name'],
                                description=t['description'],
                                parameters=t.get('parameters'),
                            )
                            for t in tools
                        ]
                    )
                ]

            model = self._client.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                generation_config={
                    "temperature": temperature,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": max_tokens,
                },
                tools=gemini_tools,
            )

            chat = model.start_chat(history=chat_history)
            response = chat.send_message(tool_response_parts)
            return self._parse_response(response, model_name)

        except Exception as e:
            logger.error(f"Admin AI tool continuation error: {e}")
            return {
                "text": "Error processing tool result. Please try again.",
                "model_used": model_name,
                "tool_calls": [],
                "error": "Tool continuation error",
            }

    def _parse_response(self, response, model_name: str) -> dict:
        """Parse Gemini response into standardized format."""
        result = {
            "text": None,
            "model_used": model_name,
            "tool_calls": [],
            "finish_reason": "UNKNOWN",
            "error": None,
        }

        try:
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]

                if hasattr(candidate, 'finish_reason') and candidate.finish_reason:
                    result["finish_reason"] = getattr(candidate.finish_reason, 'name', 'UNKNOWN') or 'UNKNOWN'

                # Check for function calls in parts
                if hasattr(candidate, 'content') and candidate.content and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            fc = part.function_call
                            tool_call = {
                                "name": fc.name,
                                "args": dict(fc.args) if fc.args else {},
                            }
                            result["tool_calls"].append(tool_call)
                        elif hasattr(part, 'text') and part.text:
                            result["text"] = (result["text"] or "") + part.text

            # Fallback text extraction
            if result["text"] is None and not result["tool_calls"]:
                try:
                    result["text"] = response.text or "I could not generate a response."
                except Exception:
                    result["text"] = "I could not generate a response."

        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            result["error"] = str(e)
            if not result["text"]:
                result["text"] = "Error parsing response."

        return result


# ===================================================================
# SINGLETON CLIENT
# ===================================================================

_admin_ai_client = None


def get_admin_ai_client() -> AdminAIGeminiClient:
    """Get or create singleton admin AI client."""
    global _admin_ai_client
    if _admin_ai_client is None:
        _admin_ai_client = AdminAIGeminiClient()
    return _admin_ai_client
