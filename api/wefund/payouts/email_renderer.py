# wefund/payouts/email_renderer.py
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_payout_rejection_email(
    *,
    payout,
    template_name: str,
    context: dict,
):
    subject = "WeFund | Payout request rejected"
    to_email = payout.trader.email
    cc_emails = ["risk1@we-fund.com"]

    html_body = render_to_string(template_name, context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body="Your payout request was rejected. Please view this email in HTML.",
        to=[to_email],
        cc=cc_emails,
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send()