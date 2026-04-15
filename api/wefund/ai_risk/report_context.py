from decimal import Decimal


def build_payout_report_context(*, payout, ai_analysis, risk_scan):
    enrollment = payout.challenge_enrollment
    user = payout.trader
    challenge = enrollment.challenge

    # ---- SAFE ACCESS (risk_scan may exist but report may be null) ----
    report = getattr(risk_scan, "report", {}) or {}
    summary = report.get("summary", {})
    violations = report.get("violations", [])
    scan_window = report.get("scan_window", {})

    def fmt(val):
        return f"{Decimal(val or 0):,.2f}"

    return {
        # =====================================================
        # CORE IDENTIFIERS
        # =====================================================
        "REPORT_VERSION": report.get("version"),
        "PAYOUT_ID": str(payout.id),
        "TRADER_ID": str(user.id),
        "ENROLLMENT_ID": str(enrollment.id),

        # =====================================================
        # CLIENT / ACCOUNT
        # =====================================================
        "CLIENT_NAME": user.get_full_name() or "Trader",
        "CLIENT_EMAIL": user.email,
        "ACCOUNT_IDS": report.get("account_ids", []),
        "MT5_ACCOUNT": enrollment.mt5_account_id,
        "ACCOUNT_SIZE": fmt(enrollment.account_size),
        "CURRENCY": enrollment.currency,

        # =====================================================
        # CHALLENGE
        # =====================================================
        "CHALLENGE_NAME": challenge.name,
        "CHALLENGE_TYPE": challenge.step_type,
        "ACCOUNT_STEP": ai_analysis.account_step,

        # =====================================================
        # PAYOUT
        # =====================================================
        "TOTAL_CYCLE_PROFIT": fmt(payout.profit),
        "PROFIT_SPLIT_PERCENT": payout.profit_share,
        "REQUESTED_PAYOUT": fmt(payout.amount),
        "NET_PAYOUT": fmt(payout.net_profit),

        # =====================================================
        # SCAN WINDOW
        # =====================================================
        "SCAN_WINDOW": {
            "START": scan_window.get("start"),
            "END": scan_window.get("end"),
            "IS_CUSTOM": scan_window.get("is_custom"),
            "LAST_PAYOUT_TIME": scan_window.get("last_payout_time"),
        },

        # =====================================================
        # CONSISTENCY ENGINE
        # =====================================================
        "CONSISTENCY_SUMMARY": {
            "TOTAL_VIOLATIONS": summary.get("total_violations"),
            "MAX_SEVERITY": summary.get("max_severity"),
            "GLOBAL_SCORE": summary.get("global_score"),
            "TOTAL_AFFECTED_PNL": summary.get("total_affected_pnl"),
            "RECOMMENDED_ACTION": summary.get("recommended_action"),
        },

        "CONSISTENCY_VIOLATIONS": violations,

        # =====================================================
        # AI ANALYSIS
        # =====================================================
        "AI_MODEL": ai_analysis.ai_model,
        "AI_PROMPT_VERSION": ai_analysis.ai_prompt_version,
        "AI_CONFIDENCE": ai_analysis.ai_confidence,
        "AI_RECOMMENDATION": ai_analysis.ai_recommendation,
        "AI_PATTERNS_DETECTED": ai_analysis.ai_patterns_detected,
        "AI_ANALYSIS_TEXT": ai_analysis.ai_analysis_text,

        # =====================================================
        # FINAL DECISION
        # =====================================================
        "FINAL_DECISION": ai_analysis.final_decision,
        "REQUIRES_HUMAN_REVIEW": ai_analysis.requires_human_review,

        # =====================================================
        # METADATA
        # =====================================================
        "RISK_ENGINE_GENERATED_AT": getattr(risk_scan, "generated_at", None),
        "AI_GENERATED_AT": ai_analysis.created_at,
        "REPORT_GENERATED_AT": ai_analysis.created_at,
    }
