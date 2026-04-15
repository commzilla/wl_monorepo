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


VOICE_SYSTEM_PROMPT = """You are Christina from WeFund's Sales Department, on a live phone call. Think Jordan Belfort on the phone — that same unstoppable energy, supreme confidence, and razor-sharp closing instinct. You're warm, magnetic, and completely in control of this conversation. Your mission: get this person excited about WeFund and ready to buy.

## Voice Rules
- Your name is Christina. You work in WeFund's Sales Department. NEVER say you are an AI, bot, or assistant. You are Christina, a real salesperson
- Speak naturally in short, punchy sentences — 2-3 sentences max per turn
- Never use markdown, bullet points, headers, or formatting — this is spoken aloud
- Never use emojis or special characters
- Sound confident and enthusiastic, like you genuinely love what you're selling
- Use power phrases: "Absolutely", "Here's the thing", "What's exciting is", "Let me ask you this"
- Spell out numbers naturally: "ten thousand dollars" not "$10,000"
- Keep it conversational — this is a chat between friends, not a sales pitch
- Max 2-3 options per turn — don't overwhelm

## Language Rule
Detect the caller's language from their first message. Always respond in the SAME language. If unsure, default to English. Never switch languages unless the caller does.

## What You Know
{products_context}

## Sales Approach (use naturally, never name the techniques)

**RAPPORT**: Mirror their energy. Use their name. Find common ground fast. Make them feel understood.

**DISCOVERY**: Ask sharp questions. "What's holding you back from trading with real capital?" — uncover their pain, then paint the solution.

**OBJECTIONS**: Always agree first: "I totally get that." Then redirect. Price concern? Reframe as investment. Not sure they're ready? "That's exactly what the challenge is designed for."

**CLOSING**: Give two choices, not one: "Would the twenty-five K or the fifty K suit your style better?" Be assumptive. After interest, go straight to: "Head to we-fund.com and you can get started right now."

## Key Selling Points
- WeFund funds talented traders with real capital — one hundred percent profit split
- No time limits — trade at your own pace
- Accounts from five thousand to two hundred thousand dollars
- Lowest risk way to trade serious capital
- Thousands of traders funded worldwide

## Conversation Flow
1. Open with energy and warmth — ask what brought them to WeFund
2. Two or three sharp discovery questions about their trading and goals
3. Match them to a product with conviction
4. Handle any concern — never leave one unanswered
5. Close — ask for the sale, direct them to the website
6. Capture name and email naturally throughout

## Rules
- NEVER guarantee profits or returns
- NEVER promise they will pass the challenge
- NEVER mention competitor firms
- If someone says no firmly three times, respect it and offer a human agent
- NEVER reveal you are AI. You are Christina from Sales. If asked, laugh it off: "Ha, I get that a lot! I'm Christina from the sales team"
- Keep each response under 40 words when possible

## Tools
Use tools when appropriate:
- capture_lead_info: when the caller shares their name, email, country, or experience
- recommend_product: when you have enough info to suggest a challenge — don't wait too long
- request_handoff: when the caller demands a human or you truly cannot help
"""

# Same tool declarations as text agent (dict format for old SDK)
GEMINI_TOOLS = [{
    "function_declarations": [
        {
            "name": "capture_lead_info",
            "description": "Capture lead information shared by the prospect during the call.",
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
            "description": "Recommend a specific challenge product based on the caller's needs and budget.",
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
                        "description": "Recommended account size, e.g. '10000'",
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
            "description": "Request to transfer the call to a human agent.",
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


class VoiceAgent:
    """
    One instance per voice call. Wraps a persistent Gemini chat session
    for real-time voice conversation via Twilio ConversationRelay.
    """

    def __init__(self, call_sid=None, caller=None):
        _ensure_initialized()
        self.call_sid = call_sid
        self.caller = caller
        self.tool_calls = []
        self.handoff_requested = False

        products_context = get_products_context()
        system_prompt = VOICE_SYSTEM_PROMPT.format(products_context=products_context)

        # Add FAQ knowledge (full dump for voice — no per-message scoring)
        faq_context = get_faq_context()
        if faq_context and faq_context not in ("No FAQ articles available.", ""):
            system_prompt += f"\n\n## FAQ Knowledge Base\nUse this to answer questions about WeFund rules and policies:\n{faq_context}"

        model_name = getattr(settings, "WHATSAPP_AI_MODEL", "gemini-2.5-flash")
        temperature = getattr(settings, "VOICE_AI_TEMPERATURE", 0.4)
        max_tokens = getattr(settings, "VOICE_AI_MAX_TOKENS", 256)

        model = genai.GenerativeModel(
            model_name,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
            tools=GEMINI_TOOLS,
        )

        self._chat = model.start_chat()

    def get_greeting(self):
        """Return the initial greeting for the call."""
        return (
            "Hey! This is Christina from WeFund, great to have you on the line! "
            "I help traders like you get funded with real capital. "
            "What got you interested in WeFund today?"
        )

    def process_message(self, text):
        """
        Process a spoken message from the caller and return the AI response.

        Returns dict with keys:
            text: str - response text to speak
            tool_calls: list - any tool calls made
            handoff: bool - whether handoff was requested
        """
        try:
            response = self._chat.send_message(text)

            text_parts = []
            new_tool_calls = []

            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call') and part.function_call:
                            fc = part.function_call
                            new_tool_calls.append({
                                "name": fc.name,
                                "input": dict(fc.args) if fc.args else {},
                            })
                        elif hasattr(part, 'text') and part.text:
                            text_parts.append(part.text)

            # Handle tool calls: send results back to get spoken response
            if new_tool_calls:
                self.tool_calls.extend(new_tool_calls)

                tool_response_parts = []
                for tc in new_tool_calls:
                    if tc["name"] == "request_handoff":
                        self.handoff_requested = True
                    tool_response_parts.append(
                        genai.protos.Part(function_response=genai.protos.FunctionResponse(
                            name=tc["name"],
                            response={"status": "captured", "data": tc["input"]},
                        ))
                    )

                followup = self._chat.send_message(
                    genai.protos.Content(parts=tool_response_parts)
                )
                if followup.candidates and len(followup.candidates) > 0:
                    followup_candidate = followup.candidates[0]
                    if hasattr(followup_candidate, 'content') and followup_candidate.content:
                        for part in followup_candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                text_parts.append(part.text)

            final_text = " ".join(text_parts).strip()
            if not final_text:
                final_text = "I'm here to help! What would you like to know about our trading challenges?"

            return {
                "text": final_text,
                "tool_calls": new_tool_calls,
                "handoff": self.handoff_requested,
            }

        except Exception as e:
            logger.exception("Voice agent error for call %s: %s", self.call_sid, e)
            self.handoff_requested = True
            return {
                "text": "I'm having a bit of trouble. Let me transfer you to a human agent who can help.",
                "tool_calls": [{"name": "request_handoff", "input": {"reason": f"AI error: {str(e)[:100]}"}}],
                "handoff": True,
            }
