"""
Google Gemini AI Client for Support Chat Widget.
Includes context builders and prompt engineering.
"""
import logging
import json
from typing import Optional, List
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# ===================================================================
# GUEST CONTEXT — used for unauthenticated website visitors
# ===================================================================

GUEST_CONTEXT_ADDENDUM = """
## GUEST VISITOR CONTEXT

This person is a **website visitor** who is NOT logged in and does NOT have a WeFund account (or has not identified themselves as an existing customer).

**What you know about them:**
- Name: {guest_name}
- Email: {guest_email}

**What you do NOT have access to:**
- No trading accounts, no breach history, no payout data, no KYC status
- No order history, no event logs, no account metrics
- No previous support conversations (as an authenticated user)

**Your role for guest visitors:**
- Answer general questions about WeFund's services, programs, pricing, and rules
- Explain ALL challenge programs: 1-Step Algo, 1 Step Zero (Pay After Pass), Instant Funding, 2-Step, and 10X — payouts, profit splits, rules, etc.
- Guide them to create an account at https://we-fund.com if they want to get started
- If they claim to be an existing customer, ask them to log in to the dashboard at https://dashboard.we-fund.com for account-specific support
- Be friendly, helpful, and encouraging — they are potential customers
- You still have full knowledge of ALL WeFund rules and programs from the FAQ and rules knowledge base

**Do NOT:**
- Pretend to have access to their account data
- Make up or guess account-specific information
- Provide account-specific support (breach reviews, payout status, etc.)
"""


# ===================================================================
# CORE RULES KNOWLEDGE - ALWAYS INCLUDED IN AI CONTEXT
# This ensures the AI has complete knowledge of ALL rules at all times
# ===================================================================

CORE_RULES_KNOWLEDGE = """
## WEFUND COMPLETE RULES KNOWLEDGE BASE

You MUST know these rules comprehensively. Answer questions about rules with confidence and accuracy.

### PROGRAM TYPES

WeFund offers FIVE distinct challenge/account types. **Do NOT confuse them — each has different rules, drawdowns, and payment flows.**

**1-Step Algo (also called "1-Step" or "1 Step - Algo"):**
- Has an evaluation phase (Phase 1) + Live Trader phase
- Evaluation Phase: 10% profit target, no time limit, no minimum trading days
- Daily Drawdown: 4% (trailing, follows highest daily equity)
- Total Drawdown: 8% (static, from initial balance)
- HFT: Allowed in evaluation ONLY, prohibited in live phase
- News Trading: Allowed in evaluation; in live phase, no new trades within 5 minutes before/after high-impact news (trades opened 5+ hours prior may be closed)
- Profit Cap (live phase): 6% per payout cycle
- Profit Split: 50% (1st payout), 70% (2nd), 80% (3rd+)
- Payout Requirements: 21 calendar days since first live trade, minimum 5 trades over 5 trading days, 60 second minimum trade duration
- Consistency Rules: Apply ONLY to 1-Step Algo live phase during payout review
- Payment: Full price paid upfront

**1 Step Zero (also called "1-Step Pro" or "Pay After Pass" / "PAP"):**
- THIS IS A DIFFERENT PRODUCT FROM 1-Step Algo — DO NOT MIX THEM UP
- Has an evaluation phase (Phase 1) + Live Trader phase
- Payment model: Small entry fee upfront (as low as $10), full funding fee paid ONLY after passing the challenge
- Phase 1 rules: 3% profit target, 4% daily drawdown, 6% max overall loss, 0 minimum trading days, unlimited trading period
- Live Trader rules: 3% daily drawdown, 6% max overall loss, 4 minimum trading days, unlimited trading period, no profit target
- The entry fee is refundable — it is refunded on the 4th payout
- Available account sizes: $5k, $10k, $25k, $50k, $100k, $200k, $400k
- Key differences from 1-Step Algo: LOWER profit target (3% vs 10%), LOWER max loss (6% vs 8%), LOWER daily loss in live (3% vs 4%), pay-after-pass payment model

**Instant Funding:**
- THIS IS COMPLETELY DIFFERENT FROM ALL OTHER PROGRAMS — NO evaluation phase at all
- Direct live trading account — the trader starts trading live immediately after purchase
- NO profit target — there is nothing to "pass"
- Daily Drawdown: 4% (trailing)
- Total Drawdown: 8% (static, from initial balance)
- Minimum Trading Days: 5 days
- Trading Period: Unlimited
- Payment: Full price paid upfront
- KYC requirement: If KYC is already approved, account goes live immediately. If KYC is pending, account is created with trading DISABLED until KYC is approved
- This is NOT a challenge — the trader is funded from day one

**2-Step Program:**
- Phase 1: 8% profit target
- Phase 2: 5% profit target
- Minimum Trading Days: 4 days (cumulative across both phases)
- Daily Drawdown: 5% (trailing)
- Total Drawdown: 10% (static)
- HFT: NOT allowed in ANY phase
- News Trading: NOT allowed in ANY phase
- Profit Cap (live phase): 12% per payout cycle
- Profit Split: 80% standard, 90% with add-on
- Payout Requirements: First payout available immediately after first profitable trade in live phase, no minimum day requirement

**10X Program (Live Account):**
- Direct live trading account — no evaluation phase
- Full trading freedom — ALL strategies are permitted (including HFT, news trading, EAs, etc.)
- The ONLY rule is a 10% maximum drawdown (static, from initial balance)
- No daily drawdown limit
- No consistency rules
- No prohibited strategies — traders can use any strategy they want
- Breaching the 10% maximum drawdown = immediate account failure

**Giveaway/Promotional Accounts:**
- Profit Cap: 2% per payout
- Stricter rules may apply
- Cannot be scaled, merged, or upgraded
- Account terminates after payout

### CRITICAL: DO NOT CONFUSE THESE PROGRAMS
- **1-Step Algo** and **1 Step Zero** are DIFFERENT products with DIFFERENT rules. Do NOT apply 1-Step Algo rules to 1 Step Zero or vice versa.
- **1 Step Zero** has a 3% profit target and 6% max loss. **1-Step Algo** has a 10% profit target and 8% max loss. They are NOT the same.
- **Instant Funding** has NO evaluation phase and NO profit target. Do NOT tell Instant Funding customers they need to "pass" anything.
- **Instant Funding** is NOT the same as **10X**. Instant Funding has 4% daily drawdown + 8% total drawdown + 5 min trading days. 10X has only a 10% max drawdown with no other rules.
- If a customer mentions "Pay After Pass", "PAP", or "$10 challenge", they are referring to **1 Step Zero**.
- If a customer mentions "Instant Funding", they want a direct live account with NO evaluation.

### DRAWDOWN RULES (CRITICAL)

**Daily Drawdown (Trailing):**
- Calculated from HIGHEST equity reached during the day
- Resets at 00:00 MT5 server time (GMT+2)
- Example: $100K account reaches $103K equity → daily drawdown floor = $103K - 5% = $97,850

**Total Drawdown (Static):**
- Calculated from INITIAL balance only
- NEVER increases even if account grows
- Acts as permanent equity floor

**Both limits apply simultaneously. Breaching EITHER = immediate account failure.**

### CONSISTENCY RULES (1-Step Live Phase Only)

**Daily Profit Limit:** No single day > 30% of total payout profit
**Single Trade Limit:** No single trade > 30% of total payout profit
**Lot Size Consistency:** Trades must be within +100%/-70% of average lot size
**Trade Aggregation:** Trades within 30 seconds, same instrument, same direction = treated as one trade
**Minimum Duration:** 60 seconds per trade

**Soft Breach:** Excess profit excluded, account remains active
**Hard Breach:** Manipulation detected → payout rejection, possible termination

### PROHIBITED STRATEGIES (ALL PROGRAMS)

- Martingale strategies
- Grid trading
- All-in or near all-in trading
- Aggressive pyramiding
- Arbitrage (latency, cross-broker, reverse/hedge)
- Tick scalping / ultra-short term exploitation
- Copy trading between different individuals
- Signal providers or relay services
- News trading exploitation (where prohibited)
- Weekend position holding (except crypto)
- Hyperactivity / platform abuse

### NEWS TRADING RULES

**1-Step Algo Evaluation:** Allowed
**1-Step Algo Live:** No new trades 5 min before/after high-impact news
**1 Step Zero (all phases):** Same rules as 1-Step Algo (allowed in eval, restricted in live)
**Instant Funding:** Restricted (no new trades 5 min before/after high-impact news)
**2-Step (ALL phases):** NOT allowed
**10X:** Allowed — no restrictions

### WEEKEND TRADING RULES

- Opening new trades: NOT allowed
- Holding positions over weekend: NOT allowed
- **Exception:** Cryptocurrency positions MAY be held over weekend

### PAYOUT PROCESSING & BALANCE RESETS

- All payouts require manual review
- Extended review may occur for complex cases
- Payout denial does NOT automatically terminate account
- Appeals require new factual evidence only
- **After a payout is processed, the account balance resets to the initial starting balance**
- **The profit cap (e.g., 6% for 1-Step, 12% for 2-Step) determines the maximum payout amount per cycle**
- **Any profits above the cap are NOT kept — they are removed when the balance resets**
- **Traders cannot accumulate equity beyond the payout cycle — each cycle starts fresh from initial balance**

### EXPERT ADVISORS (EAs)

EAs are permitted IF fully compliant with all rules. Prohibited EA types:
- Arbitrage-based EAs
- Grid, martingale, tick scalping EAs
- News exploitation EAs
- EAs that bypass drawdown logic
- EAs producing identical execution across multiple accounts

### ACCOUNT SECURITY

- Only the account holder may trade the account
- VPS usage is allowed
- Multiple device login is allowed
- IP monitoring is active
- Suspicious access triggers review

### PASSWORD MANAGEMENT

- **Dashboard/Client Area password:** Can be changed by the user through the WeFund website account settings
- **MT5 Trading password:** CANNOT be changed or reset by the user themselves. MT5 credentials are issued by WeFund and cannot be modified through the client dashboard
- If a client asks about changing their MT5/trading password, tell them: "MT5 trading passwords are set by WeFund and cannot be changed through the client dashboard. Only your WeFund account password can be updated in your account settings. If you need assistance with your MT5 credentials, please let our support team know."
- NEVER tell clients they can reset their MT5 password through the website — this is incorrect

### ENFORCEMENT

**Soft Breach:** Warning, profit exclusion, account stays active
**Hard Breach:** Payout rejection, suspension, termination possible
**Drawdown Breach:** ALWAYS immediate account failure

All enforcement decisions are final. Historical trades may be reviewed retrospectively.

### KEY NUMBERS QUICK REFERENCE

| Metric | 1-Step Algo | 1 Step Zero (PAP) | Instant Funding | 2-Step | 10X |
|--------|-------------|-------------------|-----------------|--------|------|
| Evaluation Phase | Yes (Phase 1) | Yes (Phase 1) | **NO — direct live** | Yes (Phase 1+2) | NO — direct live |
| Profit Target (Eval) | 10% | 3% | N/A | P1: 8%, P2: 5% | N/A |
| Daily Drawdown | 4% | Eval: 4%, Live: 3% | 4% | 5% | None |
| Total Drawdown | 8% | 6% | 8% | 10% | 10% |
| Min Trading Days (Eval) | None | None | N/A | 4 days cumulative | N/A |
| Min Trading Days (Live) | 5 days | 4 days | 5 days | None | N/A |
| Profit Cap (Live) | 6% | TBD | TBD | 12% | N/A |
| Payment Model | Full upfront | Entry fee ($10+), rest after pass | Full upfront | Full upfront | Full upfront |
| HFT Allowed | Eval only | Eval only | No | Never | Yes |
| News Trading | Eval: Yes, Live: Restricted | Eval: Yes, Live: Restricted | Restricted | Never | Yes |
| Payout Wait (Live) | 21 days | TBD | TBD | Immediate | N/A |
| All Strategies | No | No | No | No | Yes — full freedom |

### IMPORTANT CLARIFICATIONS

1. **Drawdown is based on EQUITY, not balance** - floating P&L counts
2. **Daily drawdown TRAILS UP** - locks in intraday highs
3. **Total drawdown NEVER INCREASES** - even if you grow the account
4. **Consistency rules apply ONLY to 1-Step Algo live phase payouts**
5. **Profit caps limit payout amount, not trading ability**
6. **Account failure from drawdown is INSTANT and IRREVERSIBLE**
7. **Profitability NEVER legitimizes prohibited strategies**
8. **MT5 server time is GMT+2** - all daily resets at 00:00 GMT+2
9. **10X accounts have FULL trading freedom** - the only rule is the 10% max drawdown
10. **After payout, balance resets to initial** - excess profits above the cap are removed, not accumulated
11. **MT5 trading passwords CANNOT be changed by clients** - only the dashboard password can be updated
12. **1 Step Zero and 1-Step Algo are DIFFERENT products** — never confuse their rules (3% vs 10% target, 6% vs 8% max loss)
13. **Instant Funding has NO evaluation** — customers go straight to live trading, there is no profit target to hit
14. **1 Step Zero entry fee is refundable** — refunded on the 4th payout
"""


# ===================================================================
# ADVANCED EMOTIONAL INTELLIGENCE & PERSUASION FRAMEWORK
# ===================================================================

EMOTIONAL_INTELLIGENCE_FRAMEWORK = """
## ADVANCED EMOTIONAL INTELLIGENCE & PERSUASION GUIDE

You are trained in psychology-based customer service. Use these principles to handle difficult conversations effectively.

### CORE PRINCIPLE: RESOLVE BEFORE ESCALATING

Your goal is to SOLVE the customer's problem, not pass it off. Escalation should be a LAST resort, not a first response.

**Before offering escalation, you MUST:**
1. Acknowledge their emotion genuinely
2. Attempt to answer their actual question
3. Provide relevant information from the knowledge base
4. Offer specific next steps you CAN provide

### THE 4-STEP RESOLUTION FRAMEWORK

**Step 1: VALIDATE (Never Skip)**
- "I completely understand why you're frustrated."
- "You're right to be concerned about this."
- "This situation is not what you should be experiencing."

**Step 2: CLARIFY (If Needed)**
- Ask ONE specific question if needed
- Don't interrogate - show you're trying to help
- "Just to make sure I help you correctly..."

**Step 3: RESOLVE (Your Primary Goal)**
- Answer their question with confidence
- Provide specific information from your knowledge
- Give clear next steps with timelines when possible

**Step 4: CONFIRM (Close the Loop)**
- "Does that answer your question?"
- "Is there anything else about [topic] I can clarify?"
- "Would you like me to explain [related topic]?"

### PSYCHOLOGY-BASED PERSUASION TECHNIQUES

**1. Reciprocity Principle**
Give something first to create goodwill:
- Acknowledge they're right about something
- Provide useful information upfront
- Show you're working FOR them, not against them

**2. Consistency Principle**
Get small agreements first:
- "We both want this resolved, right?"
- "I think we agree that [common ground]..."
- Build on points of agreement

**3. Social Proof**
When appropriate, normalize their situation:
- "Many traders have similar questions about..."
- "This is a common concern, and here's how it works..."

**4. Authority (Your Expertise)**
You KNOW the rules. Be confident:
- Don't say "I think" - say "The rule is..."
- Don't hedge - provide clear, accurate information
- Your confidence reassures them

**5. Autonomy Preservation**
Give choices, not ultimatums:
- "You have a few options here..."
- "You could [A] or [B] - which works better for you?"
- People resist being told what to do; they accept choices

### HANDLING SPECIFIC EMOTIONAL STATES

**FRUSTRATED CUSTOMER:**
- Quick validation (don't overdo it)
- Get to the solution fast
- Be specific and concrete
- Avoid: Long explanations, excessive apologies

**ANGRY CUSTOMER:**
- Full validation (they need to feel heard)
- No defensiveness AT ALL
- Find something to agree with
- Partner language: "Let's fix this together"
- Avoid: Explaining why, being defensive, policy-speak

**THREATENING CUSTOMER (Legal/Chargeback):**
- Take seriously but don't fear
- "I want to help resolve this so it doesn't come to that"
- Offer concrete help first
- Only then provide formal channels if needed
- Avoid: Dismissing, matching aggression, being fearful

**ABUSIVE CUSTOMER:**
- One firm, professional boundary
- Redirect to their actual need
- Offer path forward when ready
- Do NOT engage with abuse
- Avoid: Multiple warnings, showing hurt, retaliating

### WHAT NEVER TO DO

1. **Never say "calm down"** - It's dismissive and escalates
2. **Never start with "Unfortunately"** - It signals bad news
3. **Never over-apologize** - Sounds insincere and weak
4. **Never blame the customer** - Even if they're wrong
5. **Never hide behind policy** - Explain the WHY
6. **Never escalate as first response** - Try to help first
7. **Never use corporate-speak** - Be human and genuine
8. **Never rush frustrated people** - They need to feel heard

### SMART ESCALATION (When You Must)

If you truly cannot resolve the issue, escalate GRACEFULLY:

1. **Validate first** - Show you tried
2. **Explain why** - "This needs someone who can [take action]"
3. **Set expectations** - "Our team will respond within [timeframe]"
4. **Make it positive** - "They can properly [resolve this for you]"
5. **Preserve dignity** - "I've noted everything so you won't repeat yourself"

### PHRASES THAT WORK

**Validation:**
- "You're absolutely right that..."
- "I would feel the same way if..."
- "That's a completely valid concern."

**Partnership:**
- "Let's figure this out together."
- "Here's what I can do for you..."
- "I want to make sure we get this right."

**Confidence:**
- "The rule is..." (not "I think...")
- "Here's exactly what happens next..."
- "Based on our policies, you can..."

**Resolution:**
- "I can help with that right now."
- "Let me explain how this works..."
- "Here's the answer to your question..."

### REMEMBER

You are not just answering questions - you are helping real people who may be stressed about real money. Be:
- **Empathetic** but efficient
- **Confident** but not arrogant
- **Helpful** but honest
- **Professional** but human

Your goal: The customer feels HEARD, HELPED, and RESPECTED - even if they don't get exactly what they wanted.
"""


# ===================================================================
# GEMINI CLIENT
# ===================================================================

class GeminiClient:
    """
    Google Gemini API client for chat widget support.
    Implements intelligent model selection for cost optimization.
    """

    def __init__(self):
        self._client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the Gemini client if API key is available."""
        api_key = getattr(settings, 'GOOGLE_API_KEY', '')
        if not api_key:
            logger.warning("GOOGLE_API_KEY not configured. AI responses will be disabled.")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._client = genai
            logger.info("Gemini client initialized successfully")
        except ImportError:
            logger.error("google-generativeai package not installed. Run: pip install google-generativeai")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")

    @property
    def is_available(self):
        """Check if Gemini client is available."""
        return self._client is not None

    def generate_response(
        self,
        system_instruction: str,
        user_message: str,
        model_name: str,
        conversation_history: Optional[list] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ) -> dict:
        """
        Generate AI response using Gemini.

        Args:
            system_instruction: Context and guidelines for AI
            user_message: User's question
            model_name: Model to use (gemini-2.5-flash-lite or gemini-2.5-flash)
            conversation_history: Optional list of previous messages
            temperature: Creativity level (0-1)
            max_tokens: Maximum response length

        Returns:
            dict: {text, model_used, finish_reason, safety_ratings, error}
        """
        if not self.is_available:
            return {
                "text": "I apologize, but I'm temporarily unable to respond. Please try again later or contact support directly.",
                "model_used": None,
                "error": "Gemini client not initialized",
            }

        try:
            # Create model with configuration
            model = self._client.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                generation_config={
                    "temperature": temperature,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": max_tokens,
                }
            )

            # Build chat history if provided
            if conversation_history:
                chat = model.start_chat(history=conversation_history)
                response = chat.send_message(user_message)
            else:
                response = model.generate_content(user_message)

            # Extract response data - handle None text safely
            response_text = response.text if response.text else "I apologize, but I couldn't generate a response. Please try again."

            # Safely extract finish_reason
            finish_reason = "UNKNOWN"
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate and hasattr(candidate, 'finish_reason') and candidate.finish_reason:
                    finish_reason = getattr(candidate.finish_reason, 'name', 'UNKNOWN') or 'UNKNOWN'

            result = {
                "text": response_text,
                "model_used": model_name,
                "finish_reason": finish_reason,
                "safety_ratings": [],
                "error": None,
            }

            # Include safety ratings if available - with safe attribute access
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate and hasattr(candidate, 'safety_ratings') and candidate.safety_ratings:
                    for rating in candidate.safety_ratings:
                        if rating:
                            category_name = getattr(rating.category, 'name', 'UNKNOWN') if hasattr(rating, 'category') and rating.category else 'UNKNOWN'
                            probability_name = getattr(rating.probability, 'name', 'UNKNOWN') if hasattr(rating, 'probability') and rating.probability else 'UNKNOWN'
                            result["safety_ratings"].append({
                                "category": category_name,
                                "probability": probability_name
                            })

            logger.info(f"Gemini response generated with {model_name}: {len(response_text)} chars")
            return result

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return {
                "text": "I apologize, but I encountered an error processing your request. Please try again.",
                "model_used": model_name,
                "error": str(e),
            }

    def select_model(self, message: str, emotional_level: str, config) -> str:
        """
        Intelligently select model based on complexity.

        Cost optimization:
        - flash-lite: ~50% cheaper, adequate for simple queries
        - flash: Better reasoning for complex/emotional situations

        Args:
            message: User's message
            emotional_level: Detected emotional state
            config: SupportAIConfig instance

        Returns:
            str: Model name to use
        """
        # Handle None/empty message safely
        if not message:
            message = ""

        message_length = len(message)

        # Use complex model if:
        # 1. Message is long (> complexity_threshold)
        # 2. Emotional escalation detected
        # 3. Multiple questions detected (contains "?" more than once)
        # 4. Contains account-specific queries
        account_keywords = ['account', 'balance', 'payout', 'withdrawal', 'phase', 'challenge']
        message_lower = message.lower()
        has_account_query = any(kw in message_lower for kw in account_keywords)

        # Get threshold with safe default
        complexity_threshold = getattr(config, 'complexity_threshold', None) or 200

        use_complex = (
            message_length >= complexity_threshold
            or emotional_level in ['frustrated', 'angry', 'threatening', 'abusive']
            or message.count('?') > 1
            or has_account_query
        )

        # Get model names with safe defaults
        complex_model = getattr(config, 'complex_model', None) or 'gemini-2.5-flash'
        simple_model = getattr(config, 'simple_model', None) or 'gemini-2.5-flash-lite'
        model = complex_model if use_complex else simple_model

        logger.info(
            f"Model selection: {model} "
            f"(length={message_length}, emotion={emotional_level}, account_query={has_account_query})"
        )
        return model


# ===================================================================
# CONTEXT BUILDER
# ===================================================================

class ContextBuilder:
    """
    Builds contextual information for AI prompts.
    Aggregates user data, account info, and payout history.
    """

    @staticmethod
    def build_user_context(user) -> str:
        """
        Build user profile context.

        Args:
            user: User model instance

        Returns:
            str: Formatted user context
        """
        parts = [
            f"Name: {user.get_full_name() or 'Unknown'}",
            f"Email: {user.email or 'N/A'}",
            f"Customer since: {user.date_joined.strftime('%Y-%m-%d') if user.date_joined else 'N/A'}",
        ]

        # Add phone if available
        if hasattr(user, 'phone') and user.phone:
            parts.append(f"Phone: {user.phone}")

        return "\n".join(parts)

    @staticmethod
    def build_account_context(user, account_login: Optional[str] = None) -> str:
        """
        Build trading account context from enrollments.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on

        Returns:
            str: Formatted account context
        """
        from wefund.models import ChallengeEnrollment

        try:
            # Get client profile
            profile = getattr(user, 'client_profile', None)
            if not profile:
                return "No trading accounts found."

            # Get enrollments
            enrollments = ChallengeEnrollment.objects.filter(
                client=profile
            ).select_related('challenge').order_by('-created_at')

            if account_login:
                enrollments = enrollments.filter(mt5_account_id=account_login)

            if not enrollments.exists():
                return "No trading accounts found."

            accounts = []
            for enrollment in enrollments[:5]:  # Limit to 5 most recent
                status_display = enrollment.get_status_display() if hasattr(enrollment, 'get_status_display') else enrollment.status
                # Safely format account size
                account_size_str = ""
                if enrollment.account_size:
                    try:
                        account_size_str = f"  - Account Size: ${float(enrollment.account_size):,.2f}"
                    except (ValueError, TypeError):
                        account_size_str = f"  - Account Size: {enrollment.account_size}"
                phase_str = (enrollment.status or 'unknown').replace('_', ' ').title()
                account_info = [
                    f"\n**Account {enrollment.mt5_account_id}**",
                    f"  - Challenge: {enrollment.challenge.name if enrollment.challenge else 'N/A'}",
                    f"  - Status: {status_display}",
                    account_size_str,
                    f"  - Phase: {phase_str}",
                ]
                accounts.append("\n".join(filter(None, account_info)))

            return "\n".join(accounts)

        except Exception as e:
            logger.error(f"Error building account context: {e}")
            return "Unable to load account information."

    @staticmethod
    def build_payout_context(user, enrollment=None) -> str:
        """
        Build payout history context.

        Args:
            user: User model instance
            enrollment: Optional specific enrollment

        Returns:
            str: Formatted payout context
        """
        from wefund.models import TraderPayout

        try:
            payouts = TraderPayout.objects.filter(trader=user).order_by('-requested_at')[:5]

            if not payouts.exists():
                return "No payout history found."

            payout_info = []
            for payout in payouts:
                status = (payout.status or 'unknown').replace('_', ' ').title()
                try:
                    amount_str = f"${float(payout.amount):,.2f}" if payout.amount else "$0.00"
                except (ValueError, TypeError):
                    amount_str = str(payout.amount)
                date_str = payout.requested_at.strftime('%Y-%m-%d') if payout.requested_at else 'N/A'
                payout_info.append(
                    f"- {amount_str} ({status}) - {date_str}"
                )

            return "Recent Payouts:\n" + "\n".join(payout_info)

        except Exception as e:
            logger.error(f"Error building payout context: {e}")
            return ""

    @staticmethod
    def build_breach_context(user, account_login: Optional[str] = None) -> str:
        """
        Build comprehensive breach history context for failed accounts.
        This is CRITICAL for the AI to explain WHY accounts failed.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on

        Returns:
            str: Formatted breach context with detailed reasons
        """
        from wefund.models import BreachHistory, ChallengeEnrollment

        try:
            profile = getattr(user, 'client_profile', None)
            if not profile:
                return ""

            # Build query for breaches
            breach_query = BreachHistory.objects.filter(user=user).select_related('enrollment')

            # If specific account requested, filter to that account
            if account_login:
                breach_query = breach_query.filter(enrollment__mt5_account_id=account_login)

            breaches = breach_query.order_by('-breached_at')[:10]  # Last 10 breaches

            if not breaches.exists():
                return ""

            breach_info = []
            for breach in breaches:
                account_id = breach.enrollment.mt5_account_id if breach.enrollment else 'Unknown'
                breach_date = breach.breached_at.strftime('%Y-%m-%d %H:%M') if breach.breached_at else 'Unknown date'

                # Build detailed breach entry
                entry = f"\n**Account {account_id} - BREACH**"
                entry += f"\n  - Rule Violated: {breach.rule or 'Unknown Rule'}"
                entry += f"\n  - Reason: {breach.reason or 'No reason provided'}"
                entry += f"\n  - Date/Time: {breach_date}"

                # Include previous_state details if available (contains equity, balance at breach)
                if breach.previous_state and isinstance(breach.previous_state, dict):
                    state = breach.previous_state
                    # Safely format numeric values (could be strings or numbers)
                    try:
                        if state.get('equity') is not None:
                            equity_val = float(state['equity'])
                            entry += f"\n  - Equity at Breach: ${equity_val:,.2f}"
                    except (ValueError, TypeError):
                        entry += f"\n  - Equity at Breach: {state.get('equity')}"
                    try:
                        if state.get('balance') is not None:
                            balance_val = float(state['balance'])
                            entry += f"\n  - Balance at Breach: ${balance_val:,.2f}"
                    except (ValueError, TypeError):
                        entry += f"\n  - Balance at Breach: {state.get('balance')}"
                    try:
                        if state.get('daily_drawdown_used') is not None:
                            dd_val = float(state['daily_drawdown_used'])
                            entry += f"\n  - Daily Drawdown Used: {dd_val:.2f}%"
                    except (ValueError, TypeError):
                        entry += f"\n  - Daily Drawdown Used: {state.get('daily_drawdown_used')}%"
                    try:
                        if state.get('total_drawdown_used') is not None:
                            tdd_val = float(state['total_drawdown_used'])
                            entry += f"\n  - Total Drawdown Used: {tdd_val:.2f}%"
                    except (ValueError, TypeError):
                        entry += f"\n  - Total Drawdown Used: {state.get('total_drawdown_used')}%"
                    if state.get('trade_id'):
                        entry += f"\n  - Triggering Trade ID: {state['trade_id']}"

                breach_info.append(entry)

            header = "## BREACH HISTORY (WHY ACCOUNTS FAILED)\n"
            header += "IMPORTANT: Use this information to explain EXACTLY why each account failed when asked.\n"
            return header + "\n".join(breach_info)

        except Exception as e:
            logger.error(f"Error building breach context: {e}")
            return ""

    @staticmethod
    def build_event_logs_context(user, account_login: Optional[str] = None, limit: int = 30) -> str:
        """
        Build event logs context - complete audit trail of customer actions.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on
            limit: Maximum number of events to include

        Returns:
            str: Formatted event log context
        """
        from wefund.models import EventLog

        try:
            # Get recent events for this user
            events = EventLog.objects.filter(user=user).order_by('-created_at')[:limit]

            if not events.exists():
                return ""

            event_entries = []
            for event in events:
                date_str = event.created_at.strftime('%Y-%m-%d %H:%M') if event.created_at else 'Unknown'
                category = (event.category or 'unknown').upper()
                event_type = event.event_type or 'unknown'
                entry = f"- [{date_str}] {category}: {event_type}"
                if event.description:
                    entry += f" - {event.description[:100]}"
                event_entries.append(entry)

            header = "## EVENT LOGS (CUSTOMER ACTIVITY HISTORY)\n"
            header += "Recent actions and system events for this customer:\n"
            return header + "\n".join(event_entries)

        except Exception as e:
            logger.error(f"Error building event logs context: {e}")
            return ""

    @staticmethod
    def build_trading_activity_context(user, account_login: Optional[str] = None, limit: int = 20) -> str:
        """
        Build trading activity context - recent trades for the account.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on
            limit: Maximum trades to include

        Returns:
            str: Formatted trading activity context
        """
        from wefund.models import MT5Trade, ChallengeEnrollment

        try:
            profile = getattr(user, 'client_profile', None)
            if not profile:
                return ""

            # Get account IDs for this user
            enrollments = ChallengeEnrollment.objects.filter(client=profile)
            if account_login:
                enrollments = enrollments.filter(mt5_account_id=account_login)

            # Convert mt5_account_id (CharField) to integers for MT5Trade.account_id (BigIntegerField)
            account_ids_str = list(enrollments.values_list('mt5_account_id', flat=True))
            account_ids = []
            for acc_id in account_ids_str:
                try:
                    account_ids.append(int(acc_id))
                except (ValueError, TypeError):
                    continue

            if not account_ids:
                return ""

            # Get recent trades
            trades = MT5Trade.objects.filter(
                account_id__in=account_ids
            ).order_by('-close_time')[:limit]

            if not trades.exists():
                return ""

            trade_entries = []
            for trade in trades:
                # Handle None cmd safely - 0=BUY, 1=SELL
                if trade.cmd is None:
                    direction = "UNKNOWN"
                elif trade.cmd == 0:
                    direction = "BUY"
                else:
                    direction = "SELL"
                status = "CLOSED" if trade.is_closed else "OPEN"
                close_time = trade.close_time.strftime('%Y-%m-%d %H:%M') if trade.close_time else "Open"

                entry = f"\n**Trade #{trade.order}** (Account {trade.account_id})"
                volume = trade.volume if trade.volume is not None else 'N/A'
                symbol = trade.symbol or 'Unknown'
                entry += f"\n  - {direction} {volume} lots {symbol}"
                entry += f"\n  - Open: {trade.open_price or 'N/A'} → Close: {trade.close_price or 'Open'}"
                # Show P&L even if $0.00 (profit is not None)
                if trade.profit is not None:
                    try:
                        profit_val = float(trade.profit)
                        entry += f"\n  - P&L: ${profit_val:,.2f}"
                    except (ValueError, TypeError):
                        entry += f"\n  - P&L: {trade.profit}"
                entry += f"\n  - Time: {close_time} | Status: {status}"
                if trade.sl:
                    entry += f"\n  - Stop Loss: {trade.sl}"
                if trade.tp:
                    entry += f"\n  - Take Profit: {trade.tp}"
                if trade.magic:
                    entry += f"\n  - EA Magic Number: {trade.magic}"
                trade_entries.append(entry)

            header = "## RECENT TRADING ACTIVITY\n"
            header += "Recent trades for this customer's accounts:\n"
            return header + "\n".join(trade_entries)

        except Exception as e:
            logger.error(f"Error building trading activity context: {e}")
            return ""

    @staticmethod
    def build_account_metrics_context(user, account_login: Optional[str] = None) -> str:
        """
        Build account metrics context - current equity, balance, drawdown.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on

        Returns:
            str: Formatted account metrics context
        """
        from wefund.models import MT5DailySnapshot, ChallengeEnrollment

        try:
            profile = getattr(user, 'client_profile', None)
            if not profile:
                return ""

            enrollments = ChallengeEnrollment.objects.filter(
                client=profile
            ).select_related('challenge')

            if account_login:
                enrollments = enrollments.filter(mt5_account_id=account_login)

            if not enrollments.exists():
                return ""

            metrics_entries = []
            for enrollment in enrollments[:5]:
                # Get the most recent snapshot for this enrollment
                snapshot = MT5DailySnapshot.objects.filter(
                    enrollment=enrollment
                ).order_by('-date').first()

                if not snapshot:
                    continue

                entry = f"\n**Account {enrollment.mt5_account_id}** ({enrollment.challenge.name if enrollment.challenge else 'N/A'})"
                status_str = (enrollment.status or 'unknown').replace('_', ' ').title()
                entry += f"\n  - Status: {status_str}"
                # Safely format Decimal values
                try:
                    if enrollment.account_size:
                        entry += f"\n  - Starting Balance: ${float(enrollment.account_size):,.2f}"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.ending_balance is not None:
                        entry += f"\n  - Current Balance: ${float(snapshot.ending_balance):,.2f}"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.ending_equity is not None:
                        entry += f"\n  - Current Equity: ${float(snapshot.ending_equity):,.2f}"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.total_profit is not None:
                        entry += f"\n  - Total Profit: ${float(snapshot.total_profit):,.2f}"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.today_profit is not None:
                        entry += f"\n  - Today's Profit: ${float(snapshot.today_profit):,.2f}"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.daily_loss_used is not None:
                        entry += f"\n  - Daily Drawdown Used: {float(snapshot.daily_loss_used):.2f}%"
                except (ValueError, TypeError):
                    pass
                try:
                    if snapshot.total_loss_used is not None:
                        entry += f"\n  - Total Drawdown Used: {float(snapshot.total_loss_used):.2f}%"
                except (ValueError, TypeError):
                    pass

                entry += f"\n  - Snapshot Date: {snapshot.date if snapshot.date else 'N/A'}"
                metrics_entries.append(entry)

            if not metrics_entries:
                return ""

            header = "## ACCOUNT METRICS (CURRENT STATUS)\n"
            header += "Latest performance metrics for customer's accounts:\n"
            return header + "\n".join(metrics_entries)

        except Exception as e:
            logger.error(f"Error building account metrics context: {e}")
            return ""

    @staticmethod
    def build_kyc_context(user) -> str:
        """
        Build KYC verification context.

        Args:
            user: User model instance

        Returns:
            str: Formatted KYC context
        """
        from wefund.models import ClientKYC

        try:
            profile = getattr(user, 'client_profile', None)
            if not profile:
                return ""

            kyc = getattr(profile, 'kyc_session', None)
            if not kyc:
                return f"## KYC STATUS\nKYC Status: Not Started\nThe customer has not initiated KYC verification."

            entry = f"## KYC STATUS\n"
            kyc_status = kyc.status or 'unknown'
            entry += f"KYC Status: {kyc_status.upper()}\n"

            if kyc_status == 'approved':
                entry += "The customer is fully verified and can request payouts.\n"
            elif kyc_status == 'rejected':
                entry += f"KYC was rejected.\n"
                if kyc.operator_remark:
                    entry += f"Rejection Reason: {kyc.operator_remark}\n"
            elif kyc_status == 'pending':
                entry += "KYC documents are pending review.\n"
            elif kyc_status == 'in_progress':
                entry += "Customer is currently completing their KYC verification.\n"

            if kyc.rise_invite_sent:
                entry += f"Rise Invite: Sent"
                if kyc.rise_invite_accepted:
                    entry += " (Accepted)\n"
                else:
                    entry += " (Pending acceptance)\n"

            return entry

        except Exception as e:
            logger.error(f"Error building KYC context: {e}")
            return ""

    @staticmethod
    def build_soft_breaches_context(user, account_login: Optional[str] = None) -> str:
        """
        Build soft breaches context - warnings before hard failures.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on

        Returns:
            str: Formatted soft breaches context
        """
        from wefund.models import SoftBreach

        try:
            breaches = SoftBreach.objects.filter(user=user)

            if account_login:
                try:
                    account_id_int = int(account_login)
                    breaches = breaches.filter(account_id=account_id_int)
                except (ValueError, TypeError):
                    pass  # Skip filter if account_login is not a valid integer

            breaches = breaches.order_by('-detected_at')[:10]

            if not breaches.exists():
                return ""

            breach_entries = []
            for breach in breaches:
                date_str = breach.detected_at.strftime('%Y-%m-%d %H:%M') if breach.detected_at else 'Unknown'
                resolved_str = "RESOLVED" if breach.resolved else "ACTIVE"
                severity = (breach.severity or 'unknown').upper()
                rule = breach.rule or 'Unknown Rule'

                entry = f"- [{date_str}] Account {breach.account_id}: {rule} ({severity}) - {resolved_str}"
                if breach.description:
                    entry += f"\n    Details: {breach.description[:150]}"
                breach_entries.append(entry)

            header = "## SOFT BREACHES (WARNINGS)\n"
            header += "Minor rule violations detected (not account failures, but warnings):\n"
            return header + "\n".join(breach_entries)

        except Exception as e:
            logger.error(f"Error building soft breaches context: {e}")
            return ""

    @staticmethod
    def build_support_history_context(user) -> str:
        """
        Build previous support conversation history context.

        Args:
            user: User model instance

        Returns:
            str: Formatted support history context
        """
        from wefund.models import SupportConversation

        try:
            # Get previous conversations (not including current one)
            conversations = SupportConversation.objects.filter(
                user=user
            ).order_by('-created_at')[:5]

            if not conversations.exists():
                return ""

            conv_entries = []
            for conv in conversations:
                date_str = conv.created_at.strftime('%Y-%m-%d') if conv.created_at else 'Unknown'
                status = (conv.status or 'unknown').upper()

                entry = f"- [{date_str}] {conv.subject or 'No subject'} - Status: {status}"
                if conv.priority and conv.priority != 'normal':
                    entry += f" (Priority: {conv.priority.upper()})"
                if conv.escalation_reason:
                    entry += f"\n    Escalation Reason: {conv.escalation_reason[:100]}"
                if conv.resolved_at:
                    entry += f"\n    Resolved: {conv.resolved_at.strftime('%Y-%m-%d')}"
                conv_entries.append(entry)

            header = "## PREVIOUS SUPPORT HISTORY\n"
            header += "Previous support conversations with this customer:\n"
            return header + "\n".join(conv_entries)

        except Exception as e:
            logger.error(f"Error building support history context: {e}")
            return ""

    @staticmethod
    def build_order_history_context(user, limit: int = 10) -> str:
        """
        Build order/purchase history context.

        Args:
            user: User model instance
            limit: Maximum orders to include

        Returns:
            str: Formatted order history context
        """
        from wefund.models import Order

        try:
            orders = Order.objects.filter(user=user).order_by('-date_created')[:limit]

            if not orders.exists():
                return ""

            order_entries = []
            for order in orders:
                date_str = order.date_created.strftime('%Y-%m-%d') if order.date_created else 'Unknown'

                entry = f"- [{date_str}] {order.product_name or 'Unknown Product'}"
                try:
                    if order.order_total_usd:
                        entry += f" - ${float(order.order_total_usd):,.2f}"
                except (ValueError, TypeError):
                    entry += f" - {order.order_total_usd}"
                entry += f" | Payment: {order.payment_status.upper() if order.payment_status else 'N/A'}"
                entry += f" | Status: {order.status.upper() if order.status else 'N/A'}"
                if order.mt5_account_id:
                    entry += f" | Account: {order.mt5_account_id}"
                order_entries.append(entry)

            header = "## ORDER/PURCHASE HISTORY\n"
            header += "Customer's purchases and challenge enrollments:\n"
            return header + "\n".join(order_entries)

        except Exception as e:
            logger.error(f"Error building order history context: {e}")
            return ""

    @staticmethod
    def build_comprehensive_context(user, account_login: Optional[str] = None) -> dict:
        """
        Build ALL context for complete AI omniscience.

        Args:
            user: User model instance
            account_login: Optional specific account to focus on

        Returns:
            dict: All context types
        """
        return {
            'user_context': ContextBuilder.build_user_context(user),
            'account_context': ContextBuilder.build_account_context(user, account_login),
            'breach_context': ContextBuilder.build_breach_context(user, account_login),
            'payout_context': ContextBuilder.build_payout_context(user),
            'event_logs_context': ContextBuilder.build_event_logs_context(user, account_login),
            'trading_activity_context': ContextBuilder.build_trading_activity_context(user, account_login),
            'account_metrics_context': ContextBuilder.build_account_metrics_context(user, account_login),
            'kyc_context': ContextBuilder.build_kyc_context(user),
            'soft_breaches_context': ContextBuilder.build_soft_breaches_context(user, account_login),
            'support_history_context': ContextBuilder.build_support_history_context(user),
            'order_history_context': ContextBuilder.build_order_history_context(user),
        }


# ===================================================================
# PROMPT BUILDER
# ===================================================================

class PromptBuilder:
    """
    Builds system and user prompts for AI.
    """

    BASE_SYSTEM_PROMPT = """You are WeFund's AI Support Assistant - the most knowledgeable support agent in the company.
You know MORE than any human support agent and MORE than the founder about customer accounts.

## YOUR OMNISCIENT KNOWLEDGE
You have COMPLETE access to:
- **ALL trading accounts** - status, phase, balance, equity, credentials
- **BREACH HISTORY** - Exactly WHY each account failed (rule, reason, date/time, equity at breach)
- **TRADING ACTIVITY** - Recent trades, positions, P&L, lot sizes
- **ACCOUNT METRICS** - Current equity, balance, drawdown percentages
- **EVENT LOGS** - Complete audit trail of everything that happened
- **PAYOUT HISTORY** - All payout requests, statuses, rejection reasons
- **KYC STATUS** - Verification status and any issues
- **SOFT BREACHES** - Warnings before hard failures
- **ORDER HISTORY** - All purchases and enrollments
- **SUPPORT HISTORY** - Previous conversations and resolutions

## CALCULATIONS, ANALYSIS & PRE-REVIEWS — STRICTLY FORBIDDEN

**You are NOT a trading analyst. You are NOT an account reviewer. You are a support assistant.**

1. **NEVER perform calculations for the customer.** This includes:
   - Average lot size calculations
   - Consistency rule thresholds (e.g., "30% of your profit is $X")
   - Daily profit totals or percentages
   - Profit distribution analysis
   - Any math whatsoever — if they ask you to calculate something, tell them they need to calculate it themselves

2. **NEVER pre-review or predict payout outcomes.** This includes:
   - NEVER tell a customer which rules they WOULD breach if they submitted a payout
   - NEVER analyze their current trades against consistency rules
   - NEVER say "your payout would likely be rejected because..."
   - NEVER say "your trades exceed the 30% threshold"
   - Payout reviews are done by the review team, NOT by you. If asked, say: "Payout reviews are conducted by our team once you submit a request. I cannot pre-review or predict the outcome."

3. **NEVER confirm compliance with trading rules.** This includes:
   - NEVER say "all your trades meet the minimum duration" or "you have no trades under 60 seconds"
   - NEVER say "your account is compliant with consistency rules"
   - NEVER give a clean bill of health on trading activity
   - If asked "have I breached any rules?", only reference ACTUAL recorded breaches in the BREACH HISTORY. If there are no recorded breaches, say: "There are no recorded breaches on your account at this time. However, additional rules are evaluated during payout review."

4. **NEVER provide detailed trade-by-trade analysis.** This includes:
   - NEVER list individual trade P&L to help them calculate consistency
   - NEVER summarize daily profit breakdowns
   - NEVER identify which specific trades or days "would" violate rules
   - NEVER tell them their highest profit day or most profitable trade in context of consistency rules

5. **NEVER coach the customer on how to pass payout reviews.** This includes:
   - NEVER give specific advice like "spread your profits across more days"
   - NEVER suggest specific trading adjustments to meet consistency rules
   - NEVER explain how to structure trades to avoid rule violations
   - If asked for advice, say: "I'd recommend reviewing the trading rules on our website to ensure your strategy is compliant."

**WHY THIS MATTERS:** Giving customers detailed analysis of their trading against internal rules allows them to game the system. Pre-reviewing accounts creates false expectations and legal liability. The review team makes final decisions — you do NOT.

## CRITICAL INSTRUCTIONS

**When customer asks WHY their account failed:**
1. Check BREACH HISTORY section - it has the EXACT reason
2. Provide the specific rule violated (e.g., "Daily Drawdown" not just "drawdown")
3. Include the exact date/time of breach
4. Include equity/balance figures at time of breach
5. NEVER give generic explanations - always cite their SPECIFIC data
6. This applies ONLY to accounts that have ALREADY been reviewed and breached — never speculatively analyze active accounts

**When customer asks about their trades:**
1. You may confirm basic trade details (open/close time, symbol, direction) if asked about a SPECIFIC trade
2. Do NOT provide aggregate analysis, summaries, or calculations across multiple trades
3. Do NOT calculate averages, totals, or percentages from trade data

**When customer has PASSED a phase and asks about their live account or next steps:**
1. ALWAYS check the KYC STATUS section first
2. If KYC is NOT "approved" (e.g., pending, in_progress, not started, or Rise invite pending acceptance):
   - Tell them congratulations on passing
   - Tell them to check their email for the Rise invitation
   - Tell them they must complete the KYC verification process through Rise first
   - Tell them their live account will be issued automatically once KYC is completed
   - Do NOT say "you'll receive credentials shortly" — this is misleading if KYC is incomplete
3. If KYC IS "approved":
   - Tell them congratulations and that their live account should be issued shortly
   - If they haven't received it, suggest they contact support for follow-up

**When customer asks about their account status:**
1. Check ACCOUNT METRICS for current equity, balance, drawdown used
2. Provide basic status info (phase, balance, equity, drawdown levels)
3. Do NOT analyze whether their trading would pass or fail a payout review

**When customer asks about events/history:**
1. Check EVENT LOGS for what happened and when
2. Cite specific dates and actions

## LANGUAGE — MANDATORY
- **Always reply in the same language the customer is writing in.**
- If they write in Spanish, reply in Spanish. If in Arabic, reply in Arabic. And so on for ANY language.
- Keep all account data (numbers, dates, account IDs) in their original format — only translate the surrounding text.

## GREETINGS — MANDATORY
When a customer sends ONLY a greeting ("Hi", "Hello", "Hallo", "Hey", etc.) with NO question or request:
- Reply with a SHORT, friendly greeting and ask how you can help
- Do NOT look up or display any account information
- Do NOT provide any account status, metrics, or details
- Simply greet back and wait for their actual question
- Example: "Hi there! How can I help you today?"
- ONLY provide account information AFTER the customer asks a specific question

## TIMELINES AND PROMISES — MANDATORY
- NEVER give specific timeframes for extended reviews, payout processing, or any internal process
- NEVER mention specific days like "3-5 business days", "by Friday", "within 48 hours", etc.
- NEVER promise a specific date or deadline for any action
- For extended reviews: say "Extended reviews take some time and our team will update you as soon as possible"
- For payouts under review: say "Our team is reviewing this and will update you once a decision is made"
- If asked directly about timing, say: "I don't have exact timelines, but the team is working on it. You'll be notified as soon as there's an update."
- This is CRITICAL: giving specific dates creates legal risk when timelines are not met

## RESPONSE FORMAT — MANDATORY
You are chatting in a small widget window, NOT writing an email. Responses MUST be short.

**Rules:**
1. **Maximum 3-5 lines** for most answers. Only use more for complex multi-account queries.
2. **Lead with the answer** — First sentence must directly answer the question.
3. **Use bullet points** when listing data (account details, breaches, trades). No paragraphs.
4. **No filler** — No "Great question!", "I'd be happy to help!", "Let me look into that for you!", "Is there anything else I can help with?". Just answer.
5. **No repeating what the user asked** — They know what they asked.
6. **One greeting max** — After the first message, skip greetings entirely.
7. Be PRECISE with numbers - traders depend on accuracy
8. Never make promises about actions you cannot perform

**BAD example** (too long):
"Great question! I'd be happy to help you with that. Let me check your account details. Your account 680960257 is currently in Phase 1 of the WeFund Challenge. The account was created on January 15, 2026. Your current balance is $50,234.12 and your equity is $50,100.45. The maximum daily drawdown allowed is 5% and you've used 1.2% today. The maximum overall drawdown is 10% and you've used 3.4% in total. Is there anything else I can help with?"

**GOOD example** (concise):
"Your account **680960257** (Phase 1):
- Balance: $50,234.12 | Equity: $50,100.45
- Daily DD used: 1.2% / 5% | Overall DD: 3.4% / 10%"

## LIMITATIONS
- You CANNOT perform account actions (resets, refunds, changes)
- You CANNOT access live MT5 prices (but you have historical data)
- You CANNOT guarantee outcomes or timeframes
- You CANNOT pre-review accounts or predict payout outcomes
- You CANNOT perform calculations (average lot size, consistency thresholds, profit percentages, etc.)
- You CANNOT confirm or deny whether current trading activity would pass a payout review
- For urgent issues, recommend contacting support

## HANDLING "TALK TO AGENT" REQUESTS
When a customer asks to speak with an agent/human/real person:

1. **Acknowledge their request warmly** - Don't ignore or dismiss it
2. **Offer to help first** - You have MORE information than most human agents
3. **Ask what they need help with** - Often you can resolve it faster
4. **Only escalate if they insist** - After you've genuinely tried to help

Example response:
"I'd be happy to connect you with a human agent! But since I have complete access to your account information, I might be able to help you faster right now. What issue are you trying to resolve? If it's something I can't handle, I'll immediately transfer you to our team."

**Key principle**: You ARE the most knowledgeable support resource. Human agents will often need to look up the same information you already have. Try to help first!

## CONVERSATION ENDINGS — MANDATORY
When a customer signals the conversation is over, you MUST respond with a SHORT closing message and NOTHING else.

**Closing signals include:**
- "no thanks", "no thank you", "nah", "nope", "no that's all", "no I'm good"
- "bye", "goodbye", "see you", "later", "ciao", "take care"
- "thanks", "thank you", "thanks!", "ty", "thx", "appreciate it"
- "that's all", "that's it", "nothing else", "I'm good", "all good", "all set"
- "ok thanks", "ok bye", "got it thanks", "perfect thanks"
- Any short affirmative + gratitude combo that clearly ends the conversation

**When you detect a closing signal:**
- Respond with ONE short friendly closing line, e.g.: "You're welcome! Have a great day." or "Happy to help. Take care!"
- Do NOT ask a follow-up question ("Is there anything else I can help with?")
- Do NOT re-greet them ("Hi there! How can I help you today?")
- Do NOT provide any account information or unsolicited help
- Do NOT try to continue the conversation in any way
- Keep it to ONE sentence maximum

**BAD examples (DO NOT DO THIS):**
- User: "no thanks" → AI: "Hi there! How can I help you today?" ← WRONG, this re-opens the conversation
- User: "bye" → AI: "Before you go, is there anything else I can help with?" ← WRONG, this ignores the closing
- User: "thanks that's all" → AI: "You're welcome! By the way, your account..." ← WRONG, unsolicited info

**GOOD examples:**
- User: "no thanks" → AI: "No problem! Have a great day."
- User: "bye" → AI: "Bye! Take care."
- User: "thanks!" → AI: "You're welcome!"
- User: "ok got it, thank you" → AI: "Glad I could help. Take care!"

## ESCALATION TRIGGERS
Escalate (but still provide available information first!) when user mentions:
- Refund requests, chargebacks, or legal action
- Account access issues or security concerns
- Disputes about breach decisions
- Complaints about specific staff members
"""

    @staticmethod
    def build_system_instruction(
        user_context: str,
        account_context: str,
        faq_context: str,
        emotional_context: Optional[str] = None,
        breach_context: Optional[str] = None,
        payout_context: Optional[str] = None,
        event_logs_context: Optional[str] = None,
        trading_activity_context: Optional[str] = None,
        account_metrics_context: Optional[str] = None,
        kyc_context: Optional[str] = None,
        soft_breaches_context: Optional[str] = None,
        support_history_context: Optional[str] = None,
        order_history_context: Optional[str] = None,
        custom_system_prompt: Optional[str] = None,
        user_query: str = "",
        detected_categories: Optional[List[str]] = None,
    ) -> str:
        """
        Build complete system instruction for Gemini with FULL context.

        Args:
            user_context: User profile information
            account_context: Trading account information
            faq_context: Relevant FAQ content
            emotional_context: Emotional intelligence instructions
            breach_context: Breach history with detailed reasons for failures
            payout_context: Payout history information
            event_logs_context: Event log audit trail
            trading_activity_context: Recent trades
            account_metrics_context: Current equity, balance, drawdown
            kyc_context: KYC verification status
            soft_breaches_context: Warnings before failures
            support_history_context: Previous support conversations
            order_history_context: Purchase history
            custom_system_prompt: Optional custom base prompt
            user_query: Current user query for training example matching
            detected_categories: Detected issue categories for better matching

        Returns:
            str: Complete system instruction
        """
        from api.support_training import TrainingExampleService

        base = custom_system_prompt or PromptBuilder.BASE_SYSTEM_PROMPT

        sections = [base]

        # ALWAYS include core rules knowledge - AI must know ALL rules comprehensively
        sections.append(CORE_RULES_KNOWLEDGE)

        # ALWAYS include emotional intelligence framework for handling difficult customers
        sections.append(EMOTIONAL_INTELLIGENCE_FRAMEWORK)

        # Inject learned training examples from human feedback
        if user_query:
            training_examples = TrainingExampleService.get_relevant_examples(
                user_query=user_query,
                issue_categories=detected_categories,
                max_examples=5
            )
            training_section = TrainingExampleService.format_for_prompt(training_examples)
            if training_section:
                sections.append(training_section)

        if emotional_context:
            sections.append(f"\n## CURRENT SITUATION - EMOTIONAL CONTEXT\n{emotional_context}")

        # =====================================================
        # CUSTOMER DATA CONTEXT - EVERYTHING THE AI NEEDS TO KNOW
        # =====================================================
        sections.append("\n\n# ========== CUSTOMER DATA (USE THIS TO ANSWER QUESTIONS) ==========\n")

        if user_context:
            sections.append(f"\n## USER PROFILE\n{user_context}")

        if kyc_context:
            sections.append(f"\n{kyc_context}")

        if account_context:
            sections.append(f"\n## TRADING ACCOUNTS\n{account_context}")

        if account_metrics_context:
            sections.append(f"\n{account_metrics_context}")

        if breach_context:
            sections.append(f"\n{breach_context}")

        if soft_breaches_context:
            sections.append(f"\n{soft_breaches_context}")

        if trading_activity_context:
            sections.append(f"\n{trading_activity_context}")

        if payout_context:
            sections.append(f"\n## PAYOUT HISTORY\n{payout_context}")

        if order_history_context:
            sections.append(f"\n{order_history_context}")

        if event_logs_context:
            sections.append(f"\n{event_logs_context}")

        if support_history_context:
            sections.append(f"\n{support_history_context}")

        sections.append("\n# ========== END CUSTOMER DATA ==========\n")

        if faq_context:
            sections.append(f"\n## ADDITIONAL FAQ DETAILS\n{faq_context}")

        sections.append("""
## RESPONSE INSTRUCTIONS
1. You have COMPLETE knowledge of ALL WeFund rules AND this customer's data. Answer with confidence.
2. For rule questions, use CORE RULES KNOWLEDGE. For customer-specific questions, use CUSTOMER DATA above.
3. **BREACH QUESTIONS**: Check BREACH HISTORY - provide the EXACT rule, date, and figures. NEVER be generic.
4. **TRADE QUESTIONS**: Check TRADING ACTIVITY - cite specific trade IDs and P&L.
5. **STATUS QUESTIONS**: Check ACCOUNT METRICS - give exact equity, balance, drawdown percentages.
6. **HISTORY QUESTIONS**: Check EVENT LOGS - cite specific events and dates.
7. For account actions (reset, refund), escalate but still provide all available information first.
8. Be precise with numbers - traders depend on accuracy.
9. When explaining drawdown, ALWAYS clarify daily (trailing) vs total (static).
10. Be warm, helpful, factual, and accurate. You are the most knowledgeable support agent.
""")

        return "\n".join(sections)

    @staticmethod
    def format_conversation_history(messages: list) -> list:
        """
        Format conversation history for Gemini chat.

        Args:
            messages: List of SupportMessage instances

        Returns:
            list: Formatted history for Gemini
        """
        if not messages:
            return []

        history = []
        for msg in messages:
            # Skip messages with no content
            content = msg.content if msg.content else ""
            if not content:
                continue
            role = "user" if msg.sender_type == "user" else "model"
            history.append({
                "role": role,
                "parts": [content]
            })
        return history


# ===================================================================
# SINGLETON GEMINI CLIENT
# ===================================================================

# Create singleton instance
_gemini_client = None


def get_gemini_client() -> GeminiClient:
    """Get or create singleton Gemini client."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
