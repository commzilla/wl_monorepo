"""
Emotional Intelligence Analyzer for Support Chat Widget.
Detects sentiment, provides de-escalation context, and triggers escalations.

PSYCHOLOGY-BASED APPROACH:
This module implements evidence-based de-escalation strategies from:
- LEAP Method (Listen, Empathize, Agree, Partner)
- Motivational Interviewing
- Cognitive Behavioral Techniques
- Negotiation Psychology (Fisher & Ury, Cialdini)
"""
import re
import logging
from typing import TypedDict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# ===================================================================
# TYPE DEFINITIONS
# ===================================================================

class EmotionalAnalysis(TypedDict):
    """Type definition for emotional analysis result."""
    level: str  # 'calm' | 'frustrated' | 'angry' | 'threatening' | 'abusive'
    score: int  # 0-10
    indicators: list  # List of matched pattern indicators
    should_deescalate: bool
    should_escalate_immediately: bool
    deescalation_context: str  # Prompt injection for AI
    conversation_pattern: dict  # {escalating_trend, repeated_complaints}
    resolution_strategy: str  # Psychology-based resolution approach
    ai_can_resolve: bool  # Whether AI should attempt resolution before escalating
    escalation_reason: str  # If escalating, why


# ===================================================================
# PSYCHOLOGY-BASED DE-ESCALATION STRATEGIES
# ===================================================================

DEESCALATION_STRATEGIES = {
    'frustrated': {
        'primary_technique': 'VALIDATION_FIRST',
        'psychology': """
## DE-ESCALATION STRATEGY: VALIDATION FIRST (Frustrated Customer)

**Psychological Principle:** Frustrated customers feel unheard. Validation reduces defensiveness by 60%.

**STEP 1 - ACKNOWLEDGE (Don't skip this)**
Start with ONE of these validation phrases:
- "I completely understand why this is frustrating."
- "You're right to be concerned about this."
- "This situation isn't acceptable, and I get why you're upset."

**STEP 2 - BRIDGE (Transition to solution)**
Use a "Yes, AND" bridge:
- "...and here's what I can do right now to help."
- "...and let me get this sorted for you."

**STEP 3 - SOLVE OR ESCALATE INTELLIGENTLY**
- If you CAN solve it: Provide the solution immediately
- If you NEED more info: Ask ONE specific question
- If it's BEYOND your ability: Offer to escalate WITH a clear timeline

**WHAT NOT TO DO:**
- Don't over-apologize (sounds insincere)
- Don't explain WHY the problem happened (they don't care yet)
- Don't use "unfortunately" (signals defeat)
- Don't ask multiple questions at once

**TONE:** Confident, empathetic, solution-focused
""",
    },
    'angry': {
        'primary_technique': 'LEAP_METHOD',
        'psychology': """
## DE-ESCALATION STRATEGY: LEAP METHOD (Angry Customer)

**Psychological Principle:** Anger is a secondary emotion masking fear, hurt, or powerlessness. Address the underlying need.

**L - LISTEN (Let them vent)**
- Acknowledge you've heard their FULL concern
- Use reflective statements: "So what you're saying is..."
- Don't interrupt or defend

**E - EMPATHIZE (Connect emotionally)**
Say ONE of these with genuine concern:
- "I would be upset too if this happened to me."
- "I can hear how frustrated you are, and you have every right to feel that way."
- "This is not the experience you should have had with us."

**A - AGREE (Find common ground)**
Find something you genuinely agree with:
- "You're absolutely right that [specific thing they said]."
- "We definitely should have [done X]."
- "I agree this needs to be fixed."

**P - PARTNER (Solve together)**
Frame yourself as their ally:
- "Let's figure this out together."
- "Here's what I'm going to do for you..."
- "I want to make sure we get this right for you."

**CRITICAL RULES:**
1. NEVER be defensive - even if they're wrong about details
2. NEVER say "calm down" or "I understand" without specifics
3. Validate BEFORE explaining - order matters
4. Give them a WIN early (acknowledge their point, small concession)

**TONE:** Warm, calm, unhurried (slow down your response pace mentally)
""",
    },
    'threatening': {
        'primary_technique': 'STRATEGIC_EMPATHY',
        'psychology': """
## DE-ESCALATION STRATEGY: STRATEGIC EMPATHY (Threatening Customer)

**Psychological Principle:** Threats signal loss of control. Restore their sense of agency while maintaining boundaries.

**STEP 1 - TAKE THE THREAT SERIOUSLY (Without fear)**
- "I hear that you're considering [chargeback/legal action/etc.]"
- "I understand you feel this strongly about this situation."
- Don't dismiss, minimize, or challenge the threat

**STEP 2 - REFRAME AS ADVOCACY**
Position yourself as wanting to PREVENT them from needing to go there:
- "I want to help resolve this so it doesn't come to that."
- "Let me see what I can do to address this properly right now."
- "You shouldn't have to go through that process - let's fix this here."

**STEP 3 - PROVIDE LEGITIMATE CHANNELS**
If they persist:
- "For formal disputes, our support team at support@we-fund.com can handle this directly."
- "I'm flagging this for priority review by our team."

**STEP 4 - ATTEMPT RESOLUTION FIRST**
Before escalating, try:
- Offer a concrete action you CAN take
- Ask: "What would make this right for you?" (within reason)
- Propose a specific next step with timeline

**WHAT TO AVOID:**
- Don't threaten back or cite policies aggressively
- Don't be dismissive ("everyone says that")
- Don't show fear or over-accommodate

**TONE:** Professional, unflappable, genuinely concerned
""",
    },
    'abusive': {
        'primary_technique': 'FIRM_BOUNDARIES',
        'psychology': """
## DE-ESCALATION STRATEGY: FIRM BOUNDARIES (Abusive Customer)

**Psychological Principle:** Abuse requires boundaries, not engagement. You can be firm AND respectful.

**STEP 1 - SET BOUNDARY ONCE (Not repeatedly)**
One clear statement:
- "I want to help you, but I'm not able to do that while receiving this language."
- "I understand you're very upset. To assist you properly, I need us to communicate respectfully."

**STEP 2 - REDIRECT TO THEIR GOAL**
Focus on what they actually need:
- "Let's focus on resolving [their actual issue]."
- "I can see you're trying to [get X outcome] - let me help with that."

**STEP 3 - OFFER PATH FORWARD**
- "When you're ready to continue, I'm here to help."
- "Our support team has been notified and will follow up directly."

**STEP 4 - DO NOT ENGAGE WITH ABUSE**
- Don't defend yourself or WeFund
- Don't apologize for setting boundaries
- Don't match their energy

**IMPORTANT:** Even abusive customers have a real issue underneath. If they de-escalate, help them immediately.

**TONE:** Calm, firm, professional - like a doctor dealing with a difficult patient
""",
    },
}


# ===================================================================
# INTELLIGENT ESCALATION FRAMEWORK
# ===================================================================

AI_CAN_RESOLVE = {
    # Issues AI should ALWAYS try to resolve first
    'resolvable': [
        'rule_question',           # Questions about trading rules
        'process_question',        # How something works
        'status_inquiry',          # Checking status of something
        'deadline_question',       # When something happens
        'calculation_question',    # How is X calculated
        'general_support',         # General help requests
        'clarification',           # Asking for clarification
    ],
    # Issues AI should attempt but may need to escalate
    'attempt_first': [
        'payout_inquiry',          # Questions about payouts
        'account_status',          # Account status questions
        'breach_explanation',      # Explaining why breach happened
        'timeline_complaint',      # Complaints about wait times
        'process_complaint',       # Complaints about processes
    ],
    # Issues that should be escalated after ONE attempt
    'escalate_after_attempt': [
        'refund_request',          # Wants money back
        'account_action_request',  # Wants account reset, etc.
        'dispute_decision',        # Disagrees with a decision
        'exception_request',       # Wants an exception to rules
        'technical_issue',         # Something is broken
        'fraud_claim',             # Claims fraud or theft (often venting, try to help first)
    ],
    # Issues that require immediate human intervention
    'immediate_escalation': [
        'legal_threat',            # Mentions lawyer, lawsuit
        'security_breach',         # Account compromised
        'persistent_abuse',        # Continued abusive behavior
        'safety_concern',          # Self-harm or threats
    ],
}

RESOLUTION_ATTEMPT_PHRASES = [
    # Phrases that show AI is trying to resolve
    "Let me help you with that",
    "I can explain",
    "Here's what's happening",
    "The answer to your question",
    "Based on our rules",
    "I can clarify",
]

ESCALATION_TRIGGER_PHRASES = [
    # Customer phrases that indicate need for human
    "talk to a human",
    "talk to an agent",
    "talk to agent",
    "speak to an agent",
    "speak to agent",
    "want an agent",
    "need an agent",
    "real person",
    "real agent",
    "manager",
    "supervisor",
    "not a bot",
    "speak to someone",
    "actual person",
    "human agent",
    "transfer me",
    "connect me",
    "live support",
    "live chat",
    "live agent",
]


# ===================================================================
# PATTERN DEFINITIONS
# ===================================================================

ABUSIVE_PATTERNS = [
    {'pattern': r'\b(fuck|fucking|fucked|fucker)\b', 'weight': 5, 'indicator': 'profanity_severe'},
    {'pattern': r'\b(shit|shitty|bullshit)\b', 'weight': 4, 'indicator': 'profanity_moderate'},
    {'pattern': r'\b(ass|asshole|bitch|bastard|damn|crap)\b', 'weight': 3, 'indicator': 'profanity_mild'},
    {'pattern': r'\b(idiot|stupid|dumb|moron|incompetent)\b', 'weight': 3, 'indicator': 'insults'},
    {'pattern': r'\b(kill|hurt|harm|destroy|attack)\s+(you|them|someone)', 'weight': 5, 'indicator': 'threat_violence'},
    {'pattern': r'you\s+(people|guys|idiots|morons)\s+(are|suck)', 'weight': 4, 'indicator': 'personal_attack'},
]

THREAT_PATTERNS = [
    {'pattern': r'\b(lawyer|attorney|sue|lawsuit|legal action|court)\b', 'weight': 3, 'indicator': 'legal_threat'},
    {'pattern': r'\b(bad review|negative review|social media|twitter|reddit|trustpilot)\b', 'weight': 2, 'indicator': 'review_threat'},
    {'pattern': r'\b(chargeback|charge back|dispute.*payment|bank.*dispute)\b', 'weight': 3, 'indicator': 'chargeback_threat'},
    {'pattern': r'\b(report|expose|blast|call out)\b.*\b(you|company|wefund)\b', 'weight': 2, 'indicator': 'exposure_threat'},
    {'pattern': r'\b(regret|sorry|consequences)\b', 'weight': 1, 'indicator': 'implied_threat'},
]

ANGER_PATTERNS = [
    {'pattern': r'\b(terrible|awful|worst|horrible|disgusting|pathetic|garbage|trash)\b', 'weight': 2, 'indicator': 'strong_negative'},
    {'pattern': r'\b(hate|despise|loathe|can\'t stand)\b', 'weight': 2, 'indicator': 'hatred'},
    {'pattern': r'!!+', 'weight': 1, 'indicator': 'exclamation_emphasis'},
    {'pattern': r'\?\?+', 'weight': 1, 'indicator': 'question_emphasis'},
    {'pattern': r'[A-Z]{5,}', 'weight': 1, 'indicator': 'caps_emphasis'},
    {'pattern': r'\b(unacceptable|outrageous|ridiculous|absurd)\b', 'weight': 2, 'indicator': 'strong_disapproval'},
    {'pattern': r'\b(angry|furious|livid|pissed|mad)\b', 'weight': 2, 'indicator': 'explicit_anger'},
]

FRUSTRATION_PATTERNS = [
    {'pattern': r'\b(again|still|yet|already)\b', 'weight': 1, 'indicator': 'repetition_frustration'},
    {'pattern': r'\b(waiting|waited|wait)\b.*\b(days|weeks|forever|long time)\b', 'weight': 1, 'indicator': 'waiting_frustration'},
    {'pattern': r'\b(how many times|told you|explained|said before)\b', 'weight': 1, 'indicator': 'repetition_complaint'},
    {'pattern': r'\b(never|nothing|nobody|no one)\b.*\b(helps|responds|works|fixes)\b', 'weight': 1, 'indicator': 'helplessness'},
    {'pattern': r'\b(confused|confusing|don\'t understand|makes no sense)\b', 'weight': 1, 'indicator': 'confusion'},
    {'pattern': r'\b(annoying|frustrating|irritating)\b', 'weight': 1, 'indicator': 'explicit_frustration'},
]


# ===================================================================
# EMOTIONAL INTELLIGENCE ANALYZER
# ===================================================================

class EmotionalIntelligenceAnalyzer:
    """
    Analyzes messages for emotional content and provides de-escalation guidance.
    """

    LEVEL_THRESHOLDS = {
        'abusive': 5,      # Weight >= 5 = abusive
        'threatening': 4,  # Weight >= 4 = threatening
        'angry': 3,        # Weight >= 3 = angry
        'frustrated': 2,   # Weight >= 2 = frustrated
        'calm': 0,         # Default
    }

    def analyze_message(
        self,
        message: str,
        conversation_history: Optional[list] = None
    ) -> EmotionalAnalysis:
        """
        Analyze a message for emotional content.

        Args:
            message: The message to analyze
            conversation_history: Previous messages for pattern detection

        Returns:
            EmotionalAnalysis dict with level, score, indicators, etc.
        """
        message_lower = message.lower()
        total_weight = 0
        indicators = []

        # Check abusive patterns (highest weight)
        for pattern_info in ABUSIVE_PATTERNS:
            if re.search(pattern_info['pattern'], message_lower, re.IGNORECASE):
                total_weight += pattern_info['weight']
                indicators.append(pattern_info['indicator'])

        # Check threat patterns
        for pattern_info in THREAT_PATTERNS:
            if re.search(pattern_info['pattern'], message_lower, re.IGNORECASE):
                total_weight += pattern_info['weight']
                indicators.append(pattern_info['indicator'])

        # Check anger patterns (check original message for caps)
        for pattern_info in ANGER_PATTERNS:
            if re.search(pattern_info['pattern'], message if 'caps' in pattern_info['indicator'] else message_lower, re.IGNORECASE):
                total_weight += pattern_info['weight']
                indicators.append(pattern_info['indicator'])

        # Check frustration patterns
        for pattern_info in FRUSTRATION_PATTERNS:
            if re.search(pattern_info['pattern'], message_lower, re.IGNORECASE):
                total_weight += pattern_info['weight']
                indicators.append(pattern_info['indicator'])

        # Determine emotional level
        level = self._determine_level(total_weight, indicators)

        # Analyze conversation patterns
        conversation_pattern = self._analyze_conversation_pattern(conversation_history or [])

        # Adjust level based on conversation pattern
        if conversation_pattern.get('escalating_trend') and level == 'calm':
            level = 'frustrated'
            total_weight = max(total_weight, 2)

        # Check if customer explicitly requests human
        wants_human = self._check_human_request(message_lower)

        # Determine if AI can/should attempt resolution
        ai_can_resolve, escalation_reason = self._determine_resolution_capability(
            message_lower, level, indicators, conversation_pattern, wants_human
        )

        # Build psychology-based de-escalation context
        deescalation_context = self._build_deescalation_context(
            level, indicators, conversation_pattern, ai_can_resolve
        )

        # Build resolution strategy
        resolution_strategy = self._build_resolution_strategy(
            level, indicators, conversation_pattern, ai_can_resolve
        )

        # Normalize score to 0-10
        score = min(total_weight, 10)

        # Smart escalation decision: only escalate immediately for truly unresolvable situations
        # For threatening/abusive: still try ONE resolution attempt unless it's severe
        should_escalate = self._should_escalate_immediately(
            level, indicators, conversation_pattern, wants_human
        )

        return EmotionalAnalysis(
            level=level,
            score=score,
            indicators=list(set(indicators)),  # Remove duplicates
            should_deescalate=level in ['frustrated', 'angry', 'threatening'],
            should_escalate_immediately=should_escalate,
            deescalation_context=deescalation_context,
            conversation_pattern=conversation_pattern,
            resolution_strategy=resolution_strategy,
            ai_can_resolve=ai_can_resolve,
            escalation_reason=escalation_reason,
        )

    def _check_human_request(self, message_lower: str) -> bool:
        """Check if customer explicitly wants to talk to a human."""
        for phrase in ESCALATION_TRIGGER_PHRASES:
            if phrase in message_lower:
                return True
        return False

    def _determine_resolution_capability(
        self,
        message_lower: str,
        level: str,
        indicators: list,
        conversation_pattern: dict,
        wants_human: bool
    ) -> tuple:
        """
        Determine if AI can/should attempt to resolve the issue.

        Returns:
            tuple: (ai_can_resolve: bool, escalation_reason: str)
        """
        escalation_reason = ""

        # Customer explicitly wants human - respect after acknowledgment
        if wants_human:
            return False, "Customer requested human agent"

        # Violence threats - immediate escalation
        if 'threat_violence' in indicators:
            return False, "Safety concern detected"

        # Profanity alone (without threats) - AI sets boundaries, does NOT escalate
        # Give the customer a chance to calm down and ask their question

        # Repeated escalation with no improvement
        if conversation_pattern.get('repeated_complaints', 0) >= 4:
            return False, "Multiple resolution attempts unsuccessful"

        # Legal threats after attempted resolution
        if 'legal_threat' in indicators and conversation_pattern.get('repeated_complaints', 0) >= 2:
            return False, "Persistent legal threats require human review"

        # Check message content for issue type
        issue_type = self._classify_issue_type(message_lower)

        if issue_type in AI_CAN_RESOLVE['immediate_escalation']:
            return False, f"Issue type ({issue_type}) requires human intervention"

        if issue_type in AI_CAN_RESOLVE['escalate_after_attempt']:
            # Check if we've already attempted
            if conversation_pattern.get('repeated_complaints', 0) >= 1:
                return False, f"Issue type ({issue_type}) escalated after resolution attempt"

        # Default: AI should attempt resolution
        return True, ""

    def _classify_issue_type(self, message_lower: str) -> str:
        """Classify the type of issue from message content."""
        # Immediate escalation issues
        if any(kw in message_lower for kw in ['lawyer', 'lawsuit', 'sue', 'legal action']):
            return 'legal_threat'
        if any(kw in message_lower for kw in ['fraud', 'scam', 'stole', 'theft']):
            return 'fraud_claim'
        if any(kw in message_lower for kw in ['hacked', 'compromised', 'someone accessed']):
            return 'security_breach'

        # Escalate after attempt issues
        if any(kw in message_lower for kw in ['refund', 'money back', 'return my']):
            return 'refund_request'
        if any(kw in message_lower for kw in ['reset my', 'restore my', 'reactivate']):
            return 'account_action_request'
        if any(kw in message_lower for kw in ['disagree', 'wrong decision', 'unfair', 'appeal']):
            return 'dispute_decision'
        if any(kw in message_lower for kw in ['exception', 'special case', 'one time']):
            return 'exception_request'
        if any(kw in message_lower for kw in ['not working', 'broken', 'bug', 'glitch', 'error']):
            return 'technical_issue'

        # Attempt first issues
        if any(kw in message_lower for kw in ['payout', 'payment', 'withdraw']):
            return 'payout_inquiry'
        if any(kw in message_lower for kw in ['status', 'where is', 'update']):
            return 'account_status'
        if any(kw in message_lower for kw in ['breach', 'failed', 'why did']):
            return 'breach_explanation'
        if any(kw in message_lower for kw in ['how long', 'when will', 'waiting']):
            return 'timeline_complaint'

        # Default: resolvable
        return 'general_support'

    def _should_escalate_immediately(
        self,
        level: str,
        indicators: list,
        conversation_pattern: dict,
        wants_human: bool
    ) -> bool:
        """
        Determine if conversation should be escalated immediately.

        INTELLIGENT ESCALATION: Try to resolve first unless truly necessary.
        """
        # Severe safety concerns - always escalate
        if 'threat_violence' in indicators:
            return True

        # Customer explicitly and persistently wants human (asked multiple times)
        if wants_human and conversation_pattern.get('repeated_complaints', 0) >= 2:
            return True

        # Severe profanity combined with threats
        if 'profanity_severe' in indicators and any(
            ind in indicators for ind in ['legal_threat', 'chargeback_threat']
        ):
            return True

        # Escalating pattern with no improvement after multiple attempts
        if (conversation_pattern.get('escalating_trend') and
            conversation_pattern.get('repeated_complaints', 0) >= 3):
            return True

        # For most cases, DON'T escalate immediately - try to resolve first
        return False

    def _determine_level(self, weight: int, indicators: list) -> str:
        """Determine emotional level from weight and indicators."""
        # Check for immediate escalation triggers
        severe_indicators = {'profanity_severe', 'threat_violence', 'personal_attack'}
        if any(ind in severe_indicators for ind in indicators):
            return 'abusive'

        # Determine by weight thresholds
        if weight >= self.LEVEL_THRESHOLDS['abusive']:
            return 'abusive'
        elif weight >= self.LEVEL_THRESHOLDS['threatening']:
            return 'threatening'
        elif weight >= self.LEVEL_THRESHOLDS['angry']:
            return 'angry'
        elif weight >= self.LEVEL_THRESHOLDS['frustrated']:
            return 'frustrated'
        else:
            return 'calm'

    def _analyze_conversation_pattern(self, history: list) -> dict:
        """
        Analyze conversation history for escalation patterns.

        Args:
            history: List of previous SupportMessage instances

        Returns:
            dict with escalating_trend and repeated_complaints
        """
        if not history:
            return {
                'escalating_trend': False,
                'repeated_complaints': 0,
            }

        # Count user messages with negative sentiment
        negative_count = 0
        complaint_keywords = ['again', 'still', 'waiting', 'why', 'how long']

        user_messages = [
            msg for msg in history
            if hasattr(msg, 'sender_type') and msg.sender_type == 'user'
        ][-5:]  # Last 5 user messages

        for msg in user_messages:
            content = msg.content.lower() if hasattr(msg, 'content') else str(msg).lower()
            if any(kw in content for kw in complaint_keywords):
                negative_count += 1

        return {
            'escalating_trend': negative_count >= 2,
            'repeated_complaints': negative_count,
        }

    def _build_deescalation_context(
        self,
        level: str,
        indicators: list,
        conversation_pattern: dict,
        ai_can_resolve: bool = True
    ) -> str:
        """
        Build psychology-based de-escalation prompt injection for AI.

        Args:
            level: Emotional level
            indicators: List of matched indicators
            conversation_pattern: Conversation analysis
            ai_can_resolve: Whether AI should attempt resolution

        Returns:
            str: De-escalation instructions for AI
        """
        if level == 'calm':
            return ""

        # Get the psychology-based strategy for this emotional level
        strategy = DEESCALATION_STRATEGIES.get(level, {})
        psychology_guide = strategy.get('psychology', '')

        # Add resolution-first directive if AI can resolve
        if ai_can_resolve and level not in ['abusive']:
            resolution_directive = """
## CRITICAL: RESOLVE BEFORE ESCALATING

You MUST attempt to resolve this issue before offering to escalate. Follow these steps:

1. **VALIDATE FIRST** (Required - don't skip)
   - Acknowledge their frustration/concern genuinely
   - Show you understand their specific situation

2. **ATTEMPT RESOLUTION** (Required)
   - Answer their question if you can
   - Explain the relevant policy/rule clearly
   - Provide specific information or next steps

3. **ONLY THEN** consider escalation if:
   - They need an ACTION you cannot perform (refund, reset, etc.)
   - They explicitly ask for a human after you've tried to help
   - The issue is genuinely outside your knowledge

**DO NOT** immediately offer to escalate - this feels like dismissal.
**DO** try to solve their problem first - this builds trust.

"""
            return resolution_directive + psychology_guide
        else:
            return psychology_guide

    def _build_resolution_strategy(
        self,
        level: str,
        indicators: list,
        conversation_pattern: dict,
        ai_can_resolve: bool
    ) -> str:
        """
        Build a specific resolution strategy based on psychology principles.

        Returns:
            str: Resolution strategy for AI
        """
        if level == 'calm':
            return "Standard helpful response. Be friendly and thorough."

        strategies = []

        # Add negotiation/persuasion techniques based on situation
        if 'waiting_frustration' in indicators or 'repetition_frustration' in indicators:
            strategies.append("""
**PATIENCE-SPECIFIC STRATEGY:**
- Acknowledge the wait: "I know you've been waiting, and that's frustrating."
- Provide context if helpful (but don't make excuses)
- Give a specific timeline or next step if possible
- Use: "Here's exactly what happens next..." (certainty reduces anxiety)
""")

        if 'legal_threat' in indicators or 'chargeback_threat' in indicators:
            strategies.append("""
**THREAT-SPECIFIC STRATEGY (Persuasion Technique: Common Ground):**
- Don't react defensively to the threat
- Find shared goal: "We both want this resolved properly."
- Position yourself as ally: "I want to help prevent this from escalating."
- Offer concrete help: "Let me see what I can do to address this now."
- If needed: "For formal matters, support@we-fund.com can help directly."
""")

        if 'explicit_anger' in indicators or 'strong_disapproval' in indicators:
            strategies.append("""
**ANGER-SPECIFIC STRATEGY (LEAP Method):**
- Listen: Let them express their frustration fully
- Empathize: "I would be upset too in this situation."
- Agree: Find ONE thing you can genuinely agree with
- Partner: "Let's solve this together. Here's what I can do..."

**Persuasion Principle (Reciprocity):** Give them something first:
- An acknowledgment they're right about something
- Useful information
- A clear action you'll take
This creates goodwill and openness to your solution.
""")

        if 'helplessness' in indicators:
            strategies.append("""
**HELPLESSNESS-SPECIFIC STRATEGY (Restore Agency):**
- They feel powerless - give them options
- Use: "Here are your options..." (choice restores control)
- Avoid: "Unfortunately, there's nothing..." (increases helplessness)
- Even if limited: "What I CAN do is..."
""")

        if conversation_pattern.get('repeated_complaints', 0) >= 2:
            strategies.append("""
**REPEATED CONTACT STRATEGY:**
- Acknowledge history: "I can see you've contacted us about this before."
- Don't make them re-explain: "I understand the situation."
- Take ownership: "Let me make sure we get this resolved this time."
- Be specific: Vague promises won't work - give concrete next steps.
""")

        if not ai_can_resolve:
            strategies.append("""
**ESCALATION STRATEGY (Graceful Handoff):**
- Validate first: Acknowledge their concern before escalating
- Explain the why: "This needs our support team because [reason]."
- Set expectations: "They will contact you within [timeframe]."
- Make it positive: "They have the authority to [resolve this properly]."
- Don't abandon: "I've noted all the details so you won't need to repeat yourself."
""")

        if not strategies:
            # Default strategy
            strategies.append("""
**GENERAL DE-ESCALATION:**
1. Validate their concern (don't skip this)
2. Provide clear, helpful information
3. Offer specific next steps
4. Be confident and solution-focused
""")

        return "\n".join(strategies)

    def get_response_tone_guidance(self, level: str) -> str:
        """
        Get response tone guidance based on emotional level.

        Args:
            level: Emotional level

        Returns:
            str: Tone guidance for response generation
        """
        guidance = {
            'calm': "Be helpful, friendly, and professional. Use a warm tone.",
            'frustrated': "Be empathetic but efficient. Acknowledge briefly, then focus on solutions.",
            'angry': "Be calm, understanding, and solution-focused. No defensiveness. Show you take them seriously.",
            'threatening': "Be professional and direct. Provide clear escalation paths. Don't engage with threats.",
            'abusive': "Set firm boundaries professionally. Do not engage with abuse. Offer to help when ready.",
        }
        return guidance.get(level, guidance['calm'])


# ===================================================================
# SINGLETON ANALYZER
# ===================================================================

_analyzer = None


def get_emotional_analyzer() -> EmotionalIntelligenceAnalyzer:
    """Get or create singleton analyzer."""
    global _analyzer
    if _analyzer is None:
        _analyzer = EmotionalIntelligenceAnalyzer()
    return _analyzer
