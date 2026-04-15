"""
Blog AI Content Generation Pipeline.

Uses Gemini (Google) to generate high-quality, SEO-optimized blog content
for the WeFund prop trading platform blog.

Modes:
  - generate_outline: Research topic and produce structured outline
  - generate_article: Write full article from approved outline
  - improve_seo: Analyze and optimize existing content for SEO
"""

import json
import logging

import google.generativeai as genai
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import HasPermission

logger = logging.getLogger(__name__)

BLOG_MODEL = "gemini-2.5-flash"

# ------------------------------------
# System prompt for content generation
# ------------------------------------

BLOG_SYSTEM_PROMPT = """You are a senior content strategist for WeFund, a proprietary trading firm.
Write as an experienced trader and industry insider — NOT as a generic content writer.

Content rules:
- Write with conviction and specific opinions, not balanced hedging
- Use real trading terminology naturally (not defined for beginners unless the target audience is beginners)
- Vary sentence length dramatically: some 5-word punches, some 30-word complex sentences
- Include specific numbers, percentages, and examples (use realistic prop trading figures)
- Reference WeFund's actual features: challenge types, payout structure, risk rules
- Add rhetorical questions to engage readers
- Use transitional phrases that feel natural, not formulaic
- Include occasional informal language and contractions
- Structure content with clear value — every paragraph must teach something or make a point
- Do NOT use these overused AI patterns: "In today's...", "It's important to note...", "In conclusion...", "Let's dive in...", "At the end of the day..."
- Break the "5-paragraph essay" pattern — use varied section lengths
- Include actionable takeaways, not just theory

WeFund context:
- WeFund offers prop trading challenges where traders prove their skills to get funded
- Challenge types include 1-Step, 2-Step, and Instant Funding
- Account sizes range from $5,000 to $200,000
- Profit splits up to 90%
- Risk rules include daily loss limits, max drawdown, and consistency rules
- Traders use MT5 platform
- WeFund is based in Saint Lucia
"""


def _call_gemini(system_prompt: str, user_prompt: str, max_tokens: int = 8192) -> str:
    """Call Gemini and return the raw text response."""
    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name=BLOG_MODEL,
        system_instruction=system_prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=max_tokens,
        ),
    )

    response = model.generate_content(user_prompt)
    return response.text.strip()


def generate_outline(topic: str, keywords: list = None, target_audience: str = "intermediate") -> dict:
    """Generate a structured article outline for the given topic."""
    kw_str = ", ".join(keywords) if keywords else "none specified"

    user_prompt = f"""Create a detailed blog article outline for the topic: "{topic}"

Target audience: {target_audience} traders
Target keywords: {kw_str}

Research what would make this article genuinely valuable. Think about:
1. What do traders actually need to know about this topic?
2. What do competitor prop firm blogs miss when covering this?
3. What unique angle can WeFund bring?

Return a JSON object with this structure:
{{
  "title": "Suggested article title (compelling, includes keyword naturally)",
  "meta_description": "SEO meta description under 155 characters",
  "target_word_count": 1500,
  "sections": [
    {{
      "heading": "H2 heading text",
      "key_points": ["Point 1", "Point 2"],
      "subsections": [
        {{
          "heading": "H3 heading text",
          "key_points": ["Point 1"]
        }}
      ],
      "estimated_words": 300
    }}
  ],
  "internal_linking_opportunities": ["Related topics to link to"],
  "unique_angles": ["What makes this article different from competitors"]
}}

Return ONLY the JSON object, no markdown fences."""

    raw = _call_gemini(BLOG_SYSTEM_PROMPT, user_prompt, max_tokens=4000)
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_outline": raw, "parse_error": True}


def generate_article(outline: str, tone: str = "educational", keywords: list = None, include_wefund_cta: bool = True) -> dict:
    """Generate a full article from an approved outline."""
    kw_str = ", ".join(keywords) if keywords else "none specified"
    cta_instruction = ""
    if include_wefund_cta:
        cta_instruction = "\n- Include a natural call-to-action for WeFund's challenges near the end (not pushy, relevant to context)"

    user_prompt = f"""Write a complete blog article following this outline:

{outline}

Tone: {tone}
Target keywords (use naturally, don't stuff): {kw_str}
{cta_instruction}

Requirements:
- Write in clean HTML (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags)
- Do NOT include <h1> — the title is rendered separately
- Every section should teach something concrete
- Include at least one real-world trading example or scenario
- Vary paragraph lengths (2-6 sentences each)
- Use data points and specific numbers where relevant
- End with actionable takeaways

Return a JSON object:
{{
  "title": "Final article title",
  "content": "<h2>...</h2><p>...</p>...",
  "excerpt": "2-3 sentence summary for listings (under 300 chars)",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "SEO description under 155 chars"
}}

Return ONLY the JSON object, no markdown fences."""

    raw = _call_gemini(BLOG_SYSTEM_PROMPT, user_prompt, max_tokens=8000)
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_content": raw, "parse_error": True}


def improve_seo(content: str, focus_keyword: str) -> dict:
    """Analyze content and suggest SEO improvements."""
    # Truncate content if very long to stay within token limits
    truncated = content[:15000] if len(content) > 15000 else content

    user_prompt = f"""Analyze this blog article for SEO optimization. Focus keyword: "{focus_keyword}"

Article content:
{truncated}

Provide a JSON analysis:
{{
  "score": 75,
  "meta_title_suggestion": "Optimized title under 60 chars",
  "meta_description_suggestion": "Optimized description under 155 chars",
  "keyword_analysis": {{
    "density": "1.2%",
    "in_first_paragraph": true,
    "in_headings": true,
    "in_meta": true,
    "recommendation": "Your keyword usage is good. Consider..."
  }},
  "heading_structure": {{
    "has_h2": true,
    "h2_count": 5,
    "has_keyword_in_h2": true,
    "recommendation": "..."
  }},
  "content_suggestions": [
    "Add internal links to challenge pages",
    "Include a FAQ section for featured snippets",
    "Add image alt text with keyword variations"
  ],
  "readability": {{
    "avg_sentence_length": "medium",
    "paragraph_variety": "good",
    "recommendation": "..."
  }}
}}

Return ONLY the JSON object, no markdown fences."""

    raw = _call_gemini(BLOG_SYSTEM_PROMPT, user_prompt, max_tokens=4000)
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_analysis": raw, "parse_error": True}


# ------------------------------------
# API View
# ------------------------------------

class BlogAIGenerateView(APIView):
    """
    POST /api/admin/blog/ai-generate/

    Modes:
      - generate_outline: { mode, topic, keywords[], target_audience }
      - generate_article: { mode, outline, tone, keywords[], include_wefund_cta }
      - improve_seo: { mode, content, focus_keyword }
    """
    permission_classes = [HasPermission]
    required_permissions = ['blog.ai_generate']

    def post(self, request):
        mode = request.data.get("mode")

        if mode == "generate_outline":
            topic = request.data.get("topic", "")
            if not topic:
                return Response({"error": "topic is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = generate_outline(
                topic=topic,
                keywords=request.data.get("keywords", []),
                target_audience=request.data.get("target_audience", "intermediate"),
            )
            return Response(result)

        elif mode == "generate_article":
            outline = request.data.get("outline", "")
            if not outline:
                return Response({"error": "outline is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = generate_article(
                outline=outline,
                tone=request.data.get("tone", "educational"),
                keywords=request.data.get("keywords", []),
                include_wefund_cta=request.data.get("include_wefund_cta", True),
            )
            return Response(result)

        elif mode == "improve_seo":
            content = request.data.get("content", "")
            focus_keyword = request.data.get("focus_keyword", "")
            if not content or not focus_keyword:
                return Response(
                    {"error": "content and focus_keyword are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = improve_seo(content=content, focus_keyword=focus_keyword)
            return Response(result)

        else:
            return Response(
                {"error": f"Invalid mode: {mode}. Use generate_outline, generate_article, or improve_seo"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class BlogImageUploadView(APIView):
    """
    POST /api/admin/blog/upload-image/
    Upload an image file to BunnyCDN for use in blog posts.
    Returns the public CDN URL.
    """
    permission_classes = [HasPermission]
    required_permissions = ['blog.ai_generate']

    def post(self, request):
        from rest_framework.parsers import MultiPartParser, FormParser
        from api.utils.bunnycdn import upload_to_bunnycdn
        import uuid as _uuid

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique filename
        ext = file.name.rsplit(".", 1)[-1] if "." in file.name else "jpg"
        filename = f"blog/{_uuid.uuid4().hex[:12]}.{ext}"

        try:
            url = upload_to_bunnycdn(file, filename)
            return Response({"url": url})
        except Exception as e:
            logger.error(f"Blog image upload failed: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
