import csv
import io
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from django.template.loader import render_to_string

from api.services.email_service import EmailService

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from api.permissions import HasPermission
from rest_framework.response import Response
from rest_framework import status

from wefund.models import (
    ClientProfile,
    Challenge,
    ChallengeEnrollment,
    EventLog,
)
from wefund.event_logger import log_event, log_engine_event
from wefund.challenges.utils import create_mt5_account_for_challenge


User = get_user_model()


# ================================================================
# 🔹 USER / PROFILE HELPERS
# ================================================================
def _generate_unique_username(email: str) -> str:
    """
    Username should always be the same as the email address.
    """
    return email.lower().strip()


def get_or_create_client(full_name: str, email: str):
    """
    Returns (user, client_profile, created_new_user, plain_password)
    """
    user = User.objects.filter(email__iexact=email).first()

    if user:
        # Retrieve or create profile safely (avoids duplicate key error)
        try:
            client_profile = user.client_profile
        except ClientProfile.DoesNotExist:
            client_profile = ClientProfile.objects.create(
                user=user,
                address_info={
                    "first_name": user.first_name or "",
                    "last_name": user.last_name or "",
                    "email": email,
                }
            )
        return user, client_profile, False, None

    # New user creation
    parts = (full_name or "").strip().split()
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    username = _generate_unique_username(email)
    plain_password = get_random_string(12)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=plain_password,
        first_name=first_name,
        last_name=last_name,
        role="client",
    )

    client_profile = ClientProfile.objects.create(
        user=user,
        address_info={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
        }
    )

    return user, client_profile, True, plain_password


# ================================================================
# 🔹 EMAIL HELPERS (HTML TEMPLATES)
# ================================================================
def send_new_client_email(user, enrollment, mt5_data, plain_password):

    """
    New client:
    - HTML email with dashboard + MT5 credentials
    - Uses template: emails/bulk_import/new_client_challenge.html
    """
    subject = "WeFund | Your WeFund Account & MT5 Challenge Credentials"

    context = {
        "user": user,
        "full_name": user.get_full_name() or user.username,
        "email": user.email,
        "dashboard_password": plain_password,
        "enrollment": enrollment,
        "challenge": enrollment.challenge,
        "account_size": enrollment.account_size,
        "currency": enrollment.currency,
        "mt5_login": mt5_data.get("account_id"),
        "mt5_password": mt5_data.get("mt5_password"),
        "mt5_investor_password": mt5_data.get("investor_password"),
        "mt5_server": getattr(settings, "MT5_SERVER_NAME", "Wefund Markets Ltd"),
        "brand_name": getattr(settings, "PROJECT_BRAND_NAME", "WeFund"),
        "dashboard_url": getattr(settings, "FRONTEND_URL", "#"),
    }

    html_body = EmailService.render_template(
        "emails/bulk_import/new_client_challenge.html",
        context,
    )

    # No plain text body – just HTML
    send_mail(
        subject=subject,
        message="",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_body,
        fail_silently=False,
    )
    EmailService.log_email(subject, user.email, body_html=html_body,
                           category='other', user=user)


def send_existing_client_email(user, enrollment, mt5_data):
    """
    Existing client:
    - HTML email with only MT5 credentials
    - Uses template: emails/bulk_import/existing_client_challenge.html
    """
    subject = "WeFund | New WeFund MT5 Challenge Account Created"

    context = {
        "user": user,
        "full_name": user.get_full_name() or user.username,
        "email": user.email,
        "enrollment": enrollment,
        "challenge": enrollment.challenge,
        "account_size": enrollment.account_size,
        "currency": enrollment.currency,
        "mt5_login": mt5_data.get("account_id"),
        "mt5_password": mt5_data.get("mt5_password"),
        "mt5_investor_password": mt5_data.get("investor_password"),
        "mt5_server": getattr(settings, "MT5_SERVER_NAME", "Wefund Markets Ltd"),
        "brand_name": getattr(settings, "PROJECT_BRAND_NAME", "WeFund"),
        "dashboard_url": getattr(settings, "FRONTEND_URL", "#"),
    }

    html_body = EmailService.render_template(
        "emails/bulk_import/existing_client_challenge.html",
        context,
    )

    send_mail(
        subject=subject,
        message="",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_body,
        fail_silently=False,
    )
    EmailService.log_email(subject, user.email, body_html=html_body,
                           category='other', user=user)


# ================================================================
# MAIN IMPORT VIEW
# ================================================================
class BulkChallengeEnrollmentImportView(APIView):
    """CSV Import → Bulk Challenge Enrollment Creation"""
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.bulk_import']
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"detail": "Upload a CSV file using key 'file'."}, status=400)

        try:
            decoded = io.TextIOWrapper(uploaded_file.file, encoding="utf-8")
            reader = csv.DictReader(decoded)
        except Exception as e:
            return Response({"detail": f"Unable to read CSV: {e}"}, status=400)

        results = []
        success_count = 0
        fail_count = 0
        row_no = 1
        ip = request.META.get("REMOTE_ADDR")

        required_headers = {
            "challenge name": "challenge",
            "account size": "size",
            "full name": "full_name",
            "email address": "email",
            "email": "email",
        }

        # Normalize CSV header mapping
        header_map = {}
        for h in reader.fieldnames:
            key = (h or "").strip().lower()
            if key in required_headers:
                header_map[required_headers[key]] = h

        for r in ["challenge", "size", "full_name", "email"]:
            if r not in header_map:
                return Response(
                    {"detail": "Missing required CSV columns.", "missing": r},
                    status=400,
                )

        # Process each row
        for row in reader:
            row_no += 1
            try:
                challenge_name = row[header_map["challenge"]].strip()
                full_name = row[header_map["full_name"]].strip()
                email = row[header_map["email"]].lower().strip()
                size_raw = row[header_map["size"]].strip()

                try:
                    account_size = Decimal(size_raw)
                except:
                    raise ValueError(f"Invalid account size '{size_raw}'")

                challenge = Challenge.objects.filter(name__iexact=challenge_name).first()
                if not challenge:
                    raise ValueError(f"Challenge '{challenge_name}' not found")
                
                # User creation
                user, client, is_new, plain_password = get_or_create_client(full_name, email)

                with transaction.atomic():
                    
                    # Log account creation
                    if is_new:
                        log_event(
                        event_type="account_created",
                        user=user,
                        request=request,  # important
                        category="account",
                        metadata={"source": "bulk_import", "email": email},
                        description="User created via bulk challenge import"
                    )


                    # Enrollment creation
                    enrollment = ChallengeEnrollment.objects.create(
                        client=client,
                        challenge=challenge,
                        account_size=account_size,
                        currency="USD",
                        status="phase_1_in_progress",
                        notes="Created via bulk challenge import",
                    )

                    log_event(
                        event_type="challenge_started",
                        user=user,
                        request=request,
                        category="challenge",
                        challenge_enrollment=enrollment,
                        metadata={"challenge": challenge_name},
                        description="Challenge enrollment created via bulk import"
                    )


                    # Create MT5 account
                    mt5 = create_mt5_account_for_challenge(
                        user=user,
                        account_size=float(account_size),
                        phase_name="Phase 1",
                        enrollment=enrollment,
                    )

                    enrollment.broker_type = "mt5"
                    enrollment.mt5_account_id = mt5["account_id"]
                    enrollment.mt5_password = mt5["mt5_password"]
                    enrollment.mt5_investor_password = mt5["investor_password"]
                    enrollment.save()

                    log_event(
                        event_type="mt5_account_created",
                        user=user,
                        request=request,
                        category="mt5",
                        challenge_enrollment=enrollment,
                        metadata={"mt5_account_id": mt5["account_id"]},
                        description="MT5 account issued via bulk import"
                    )

                # Send emails
                try:
                    if is_new:
                        send_new_client_email(user, enrollment, mt5, plain_password)
                    else:
                        send_existing_client_email(user, enrollment, mt5)
                except Exception as e:
                    log_event(
                        event_type="system_error",
                        user=request.user,
                        request=request,
                        category="system",
                        metadata={"error": str(e)},
                        description="Email sending failed",
                    )


                success_count += 1

                log_event(
                    event_type="migration_row_success",
                    user=request.user,
                    request=request,
                    category="migration",
                    challenge_enrollment=enrollment,
                    metadata={
                        "row_number": row_no,
                        "email": email,
                        "challenge_name": challenge_name,
                        "account_size": str(account_size),
                        "new_user": is_new,
                    },
                    description=f"Bulk challenge import row {row_no} processed successfully."
                )


                results.append({"row": row_no, "email": email, "status": "success"})

            except Exception as e:
                fail_count += 1

                log_event(
                    event_type="migration_row_failed",
                    user=request.user,
                    request=request,
                    category="migration",
                    metadata={"row_number": row_no, "error": str(e)},
                    description=f"Bulk challenge import row {row_no} failed"
                )


                results.append({"row": row_no, "error": str(e), "status": "failed"})

        return Response(
            {
                "total": len(results),
                "success": success_count,
                "failed": fail_count,
                "results": results,
            }
        )