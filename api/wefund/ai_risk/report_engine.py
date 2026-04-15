from .report_context import build_payout_report_context
from .report_renderer import render_report_pdf


def generate_payout_risk_report(*, payout, ai_analysis, risk_scan):
    context = build_payout_report_context(
        payout=payout,
        ai_analysis=ai_analysis,
        risk_scan=risk_scan,
    )

    pdf_path = render_report_pdf(
        template_name="reports/payout_risk_report.html",
        context=context,
    )

    return pdf_path
