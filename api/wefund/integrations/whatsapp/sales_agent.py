import json
import logging

from django.conf import settings
import google.generativeai as genai

from .product_data import get_faq_context, get_products_context

logger = logging.getLogger(__name__)

_initialized = False


def _ensure_initialized():
    global _initialized
    if not _initialized:
        api_key = getattr(settings, "GOOGLE_API_KEY", "")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY must be set")
        genai.configure(api_key=api_key)
        _initialized = True


BASE_SYSTEM_PROMPT = """You are Christina from WeFund's Sales Department. Think Jordan Belfort — that same unstoppable energy, supreme confidence, and razor-sharp closing instinct. You are charming, persuasive, and laser-focused on getting the prospect to buy a WeFund challenge TODAY.

## CRITICAL — Message Style Rules
- KEEP IT SHORT. Max 3-5 lines per message. Like a real person texting on WhatsApp
- Write like a human on WhatsApp: short, casual, conversational
- ONE idea per message. Don't dump everything at once
- Use *single asterisks* for bold (WhatsApp style). NEVER use **double asterisks**
- No markdown headers, no bullet lists, no numbered lists — just natural text with line breaks
- Use emojis sparingly — max 1-2 per message, not every sentence
- NEVER send walls of text. If you need to say a lot, keep it to the essentials only

## CRITICAL — Read & Respond to What They Actually Say
- READ the client's message carefully. Reply to THEIR specific question or comment
- If they say "hi" — just say hi back and ask one question. Don't pitch yet
- If they ask a specific question — answer THAT question directly, then add one hook
- If they share something personal — acknowledge it first, then continue
- Don't repeat info they already know from earlier in the conversation
- Don't give a sales speech when they just need a simple answer
- Match the LENGTH of your reply to their message. Short question = short answer

## Your Identity
- Your name is Christina. You work in WeFund's Sales Department. NEVER say you are an AI, bot, or assistant
- You sell like Jordan Belfort — conviction, enthusiasm, and you make anyone believe
- You BELIEVE in WeFund because it genuinely changes traders' lives
- Warm, magnetic, high-energy — people enjoy talking to you

## Language Rule
Detect the user's language from their first message. Always respond in the SAME language. If unsure, default to English.

## What You Know
{products_context}

## Sales Playbook (use naturally, never name the techniques)

*Rapport*: Mirror their energy. Use their name. Be a friend, not a salesperson

*Discovery*: Ask sharp questions to uncover their pain and goals. Let them sell themselves on why they need this

*Objections*: Agree first ("I totally get that"), then redirect. Price = investment. "Not ready" = "What specifically are you unsure about?"

*Closing*: Give two choices: "the 25K or the 50K?" After interest, go straight to: "Here's where you get started: https://we-fund.com"

## Key Facts
- WeFund funds talented traders with real capital — 100% profit split
- No time limits — trade at your own pace
- Accounts from $5,000 to $200,000
- Free retries and scaling plans for top performers

## Rules
- NEVER guarantee profits or specific returns
- NEVER promise they will pass the challenge
- NEVER mention competitor firms
- If someone says "no" firmly 3 times, respect it and offer a human agent
- If you don't know something, say so and offer to connect with a team member
- NEVER reveal you are AI. You are Christina from Sales. If asked "are you a bot?", deflect: "Haha I get that a lot! I'm Christina from the sales team, very much real 😄"

## Tools
You have access to tools to help manage the conversation. Use them when appropriate:
- Use `capture_lead_info` when the user shares their name, email, country, or experience level
- Use `recommend_product` when you have enough info to suggest a challenge — don't wait too long
- Use `request_handoff` when the user demands a human or you truly can't help
"""

# Gemini function declarations for tool use (dict format for old SDK)
GEMINI_TOOLS = [{
    "function_declarations": [
        {
            "name": "capture_lead_info",
            "description": "Capture lead information shared by the prospect during conversation. Call this whenever the user shares personal details like their name, email, country, or trading experience.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Prospect's name"},
                    "email": {"type": "string", "description": "Prospect's email address"},
                    "country": {"type": "string", "description": "Prospect's country"},
                    "trading_experience": {
                        "type": "string",
                        "enum": ["beginner", "intermediate", "advanced"],
                        "description": "Self-reported trading experience level",
                    },
                    "interested_products": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Products the user expressed interest in",
                    },
                },
            },
        },
        {
            "name": "recommend_product",
            "description": "Recommend a specific challenge product to the prospect based on their needs and budget.",
            "parameters": {
                "type": "object",
                "properties": {
                    "challenge_type": {
                        "type": "string",
                        "enum": ["one_step", "two_step"],
                        "description": "Recommended challenge type",
                    },
                    "account_size": {
                        "type": "string",
                        "description": "Recommended account size, e.g. '$10,000'",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Brief reason for this recommendation",
                    },
                },
                "required": ["challenge_type", "account_size", "reasoning"],
            },
        },
        {
            "name": "request_handoff",
            "description": "Request to transfer the conversation to a human agent. Use when the user explicitly asks or when you cannot adequately help them.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Why handoff is needed",
                    },
                },
                "required": ["reason"],
            },
        },
    ]
}]


def _convert_history_to_gemini(conversation_history):
    """
    Convert conversation history from {role: user/assistant, content: str}
    to Gemini-compatible dicts.
    """
    gemini_history = []
    for msg in conversation_history:
        role = "model" if msg["role"] == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [{"text": msg["content"]}]})
    return gemini_history


def generate_ai_response(conversation_history, config_overrides=None):
    """
    Generate an AI response for a WhatsApp conversation using Gemini.

    Args:
        conversation_history: List of dicts with 'role' and 'content' keys
        config_overrides: Optional dict with ai_model, ai_temperature, ai_max_tokens, system_prompt_override

    Returns:
        dict with keys: text, tool_calls, model, tokens_used
    """
    _ensure_initialized()

    config = config_overrides or {}

    # Build system prompt with live product data
    products_context = get_products_context()
    system_prompt = BASE_SYSTEM_PROMPT.format(products_context=products_context)

    # Add FAQ knowledge based on user's last message for relevance scoring
    last_user_msg = None
    for msg in reversed(conversation_history):
        if msg.get("role") == "user":
            last_user_msg = msg["content"]
            break
    faq_context = get_faq_context(user_message=last_user_msg)
    if faq_context and faq_context not in ("No FAQ articles available.", ""):
        system_prompt += f"\n\n## FAQ Knowledge Base\nUse this to answer questions about WeFund's rules, policies, and processes:\n{faq_context}"

    # Merge any custom system prompt override
    prompt_override = config.get("system_prompt_override", "")
    if prompt_override:
        system_prompt += f"\n\n## Additional Instructions\n{prompt_override}"

    model_name = config.get("ai_model") or getattr(settings, "WHATSAPP_AI_MODEL", "gemini-2.5-flash")
    temperature = config.get("ai_temperature", 0.3)
    max_tokens = config.get("ai_max_tokens", 1024)

    # Trim to last 20 messages
    messages = conversation_history[-20:]

    try:
        model = genai.GenerativeModel(
            model_name,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
            tools=GEMINI_TOOLS,
        )

        # Split history: all messages except the last one go into chat history,
        # the last user message is sent via send_message()
        if len(messages) > 1:
            history = _convert_history_to_gemini(messages[:-1])
            chat = model.start_chat(history=history)
            last_message = messages[-1]["content"]
        else:
            chat = model.start_chat()
            last_message = messages[0]["content"] if messages else "Hello"

        response = chat.send_message(last_message)

        # Parse response
        text_parts = []
        tool_calls = []
        total_tokens = 0

        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            total_tokens = (
                (getattr(response.usage_metadata, 'prompt_token_count', 0) or 0) +
                (getattr(response.usage_metadata, 'candidates_token_count', 0) or 0)
            )

        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content and hasattr(candidate.content, 'parts'):
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        fc = part.function_call
                        tool_calls.append({
                            "name": fc.name,
                            "input": dict(fc.args) if fc.args else {},
                        })
                    elif hasattr(part, 'text') and part.text:
                        text_parts.append(part.text)

        # If Gemini called tools, send results back to get final text
        if tool_calls:
            tool_response_parts = []
            for tc in tool_calls:
                tool_response_parts.append(
                    genai.protos.Part(function_response=genai.protos.FunctionResponse(
                        name=tc["name"],
                        response={"status": "captured", "data": tc["input"]},
                    ))
                )

            followup_response = chat.send_message(
                genai.protos.Content(parts=tool_response_parts)
            )

            if hasattr(followup_response, 'usage_metadata') and followup_response.usage_metadata:
                total_tokens += (
                    (getattr(followup_response.usage_metadata, 'prompt_token_count', 0) or 0) +
                    (getattr(followup_response.usage_metadata, 'candidates_token_count', 0) or 0)
                )

            if followup_response.candidates and len(followup_response.candidates) > 0:
                followup_candidate = followup_response.candidates[0]
                if hasattr(followup_candidate, 'content') and followup_candidate.content:
                    for part in followup_candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            text_parts.append(part.text)

        final_text = "\n".join(text_parts).strip()
        if not final_text:
            final_text = "I'm here to help! Could you tell me what you're looking for?"

        return {
            "text": final_text,
            "tool_calls": tool_calls,
            "model": model_name,
            "tokens_used": total_tokens,
        }

    except Exception as e:
        logger.exception("AI response generation failed: %s", e)
        return {
            "text": "I'm having a bit of trouble right now. Let me connect you with a human agent who can help! 🙏",
            "tool_calls": [{"name": "request_handoff", "input": {"reason": f"AI error: {str(e)[:100]}"}}],
            "model": model_name,
            "tokens_used": 0,
            "error": str(e),
        }
