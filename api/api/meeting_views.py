import uuid
import logging
from datetime import datetime, timedelta, time, date
from django.utils import timezone as dj_timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from api.permissions import HasPermission
from django.shortcuts import get_object_or_404

from wefund.models import MeetingProfile, MeetingAvailability, MeetingDateOverride, MeetingBooking
from api.serializers import (
    MeetingProfileSerializer,
    MeetingProfilePublicSerializer,
    MeetingAvailabilitySerializer,
    MeetingDateOverrideSerializer,
    MeetingBookingSerializer,
    MeetingBookingCreateSerializer,
    MeetingBookingPublicSerializer,
    AdminMeetingBookingCreateSerializer,
)
from wefund.integrations.daily.engine import create_room, generate_meeting_token, delete_room
from wefund.integrations.google_calendar.engine import get_auth_url, handle_callback, get_busy_times

logger = logging.getLogger(__name__)


# ============================================================
# Slot Computation Logic
# ============================================================

def compute_available_slots(meeting_profile, target_date, duration_minutes, guest_timezone=None):
    """
    Compute available time slots for a given date and duration.

    1. Get weekly availability for that day_of_week
    2. Check date_overrides (blocked? custom hours?)
    3. Generate candidate slots from available windows (every 15min)
    4. Filter out slots that overlap existing confirmed bookings (+ buffer)
    5. If Google Calendar connected: filter out Google busy times
    6. Return remaining available slots
    """
    # When guest timezone differs, target_date is in the guest's timezone.
    # Find which host dates cover this guest date, compute slots for each,
    # convert to guest timezone, and filter to only slots on the guest's date.
    if guest_timezone and guest_timezone != meeting_profile.timezone:
        try:
            from zoneinfo import ZoneInfo
            host_tz = ZoneInfo(meeting_profile.timezone)
            guest_tz = ZoneInfo(guest_timezone)

            guest_day_start = datetime.combine(target_date, time.min).replace(tzinfo=guest_tz)
            guest_day_end = datetime.combine(target_date, time.max).replace(tzinfo=guest_tz)
            host_dates = sorted({
                guest_day_start.astimezone(host_tz).date(),
                guest_day_end.astimezone(host_tz).date(),
            })

            result = []
            for hd in host_dates:
                raw_slots = compute_available_slots(meeting_profile, hd, duration_minutes)
                for slot in raw_slots:
                    s = datetime.fromisoformat(slot['start_time']).replace(tzinfo=host_tz).astimezone(guest_tz)
                    e = datetime.fromisoformat(slot['end_time']).replace(tzinfo=host_tz).astimezone(guest_tz)
                    if s.date() == target_date:
                        result.append({
                            'start_time': s.isoformat(),
                            'end_time': e.isoformat(),
                        })
            return result
        except Exception:
            pass  # Fall through to normal computation

    day_of_week = target_date.weekday()  # Monday=0, Sunday=6

    # Step 1 & 2: Check date overrides first
    overrides = MeetingDateOverride.objects.filter(
        meeting_profile=meeting_profile,
        date=target_date
    )

    blocked_overrides = overrides.filter(is_blocked=True, start_time__isnull=True)
    if blocked_overrides.exists():
        return []  # Entire day is blocked

    # Get available windows
    available_windows = []

    custom_overrides = overrides.filter(is_blocked=False, start_time__isnull=False)
    if custom_overrides.exists():
        # Use custom hours for this date
        for override in custom_overrides:
            available_windows.append((override.start_time, override.end_time))
    else:
        # Use weekly availability
        availabilities = MeetingAvailability.objects.filter(
            meeting_profile=meeting_profile,
            day_of_week=day_of_week,
            is_active=True
        )
        for avail in availabilities:
            available_windows.append((avail.start_time, avail.end_time))

    if not available_windows:
        return []

    # Step 3: Generate candidate slots (every 15min)
    candidates = []
    for window_start, window_end in available_windows:
        slot_start = datetime.combine(target_date, window_start)
        window_end_dt = datetime.combine(target_date, window_end)

        while slot_start + timedelta(minutes=duration_minutes) <= window_end_dt:
            slot_end = slot_start + timedelta(minutes=duration_minutes)
            candidates.append((slot_start, slot_end))
            slot_start += timedelta(minutes=duration_minutes)

    if not candidates:
        return []

    # Step 4: Filter out overlapping bookings (+ buffer)
    buffer = timedelta(minutes=meeting_profile.buffer_minutes)
    day_start = datetime.combine(target_date, time.min)
    day_end = datetime.combine(target_date, time.max)

    bookings = MeetingBooking.objects.filter(
        meeting_profile=meeting_profile,
        start_time__date=target_date,
        status__in=['pending', 'confirmed']
    ).values_list('start_time', 'end_time')

    booked_ranges = []
    for b_start, b_end in bookings:
        # Make naive if needed
        if b_start.tzinfo:
            b_start = b_start.replace(tzinfo=None)
        if b_end.tzinfo:
            b_end = b_end.replace(tzinfo=None)
        booked_ranges.append((b_start - buffer, b_end + buffer))

    def overlaps_booking(slot_start, slot_end):
        for b_start, b_end in booked_ranges:
            if slot_start < b_end and slot_end > b_start:
                return True
        return False

    candidates = [(s, e) for s, e in candidates if not overlaps_booking(s, e)]

    # Step 5: Filter Google Calendar busy times
    if meeting_profile.google_calendar_connected:
        try:
            busy_times = get_busy_times(meeting_profile, day_start, day_end)
            def overlaps_busy(slot_start, slot_end):
                for busy_start, busy_end in busy_times:
                    if busy_start.tzinfo:
                        busy_start = busy_start.replace(tzinfo=None)
                    if busy_end.tzinfo:
                        busy_end = busy_end.replace(tzinfo=None)
                    if slot_start < busy_end and slot_end > busy_start:
                        return True
                return False
            candidates = [(s, e) for s, e in candidates if not overlaps_busy(s, e)]
        except Exception as e:
            logger.warning(f"Google Calendar check failed, proceeding without: {e}")

    # Filter out past slots — compare in the admin's timezone
    from zoneinfo import ZoneInfo
    try:
        admin_tz = ZoneInfo(meeting_profile.timezone)
    except Exception:
        admin_tz = ZoneInfo('UTC')
    now_in_admin_tz = datetime.now(admin_tz).replace(tzinfo=None)
    min_notice = timedelta(hours=meeting_profile.min_notice_hours)
    earliest_bookable = now_in_admin_tz + min_notice
    candidates = [(s, e) for s, e in candidates if s > earliest_bookable]

    return [
        {
            'start_time': s.isoformat(),
            'end_time': e.isoformat(),
        }
        for s, e in candidates
    ]


# ============================================================
# Public Endpoints (AllowAny)
# ============================================================

class MeetingProfilePublicView(APIView):
    """GET /meet/:slug/ — Get admin's public profile."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        profile = get_object_or_404(MeetingProfile, slug=slug, is_active=True)
        serializer = MeetingProfilePublicSerializer(profile)
        return Response(serializer.data)


class MeetingAvailableSlotsView(APIView):
    """GET /meet/:slug/slots/?date=2026-02-20&duration=30"""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        profile = get_object_or_404(MeetingProfile, slug=slug, is_active=True)

        date_str = request.query_params.get('date')
        duration = request.query_params.get('duration', str(profile.default_duration))

        if not date_str:
            return Response({'error': 'date parameter is required'}, status=400)

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        try:
            duration_minutes = int(duration)
        except ValueError:
            return Response({'error': 'duration must be a number'}, status=400)

        if duration_minutes not in profile.durations_offered:
            return Response({'error': f'Duration {duration_minutes} not offered. Available: {profile.durations_offered}'}, status=400)

        # Check max_days_ahead
        today = date.today()
        if target_date < today:
            return Response({'error': 'Cannot book dates in the past'}, status=400)
        if (target_date - today).days > profile.max_days_ahead:
            return Response({'error': f'Cannot book more than {profile.max_days_ahead} days ahead'}, status=400)

        guest_timezone = request.query_params.get('timezone')
        slots = compute_available_slots(profile, target_date, duration_minutes, guest_timezone=guest_timezone)
        return Response({
            'date': date_str,
            'duration': duration_minutes,
            'slots': slots,
            'guest_timezone': guest_timezone,
        })


class MeetingBookingCreateView(APIView):
    """POST /meet/:slug/book/ — Create a booking."""
    permission_classes = [AllowAny]

    def post(self, request, slug):
        profile = get_object_or_404(MeetingProfile, slug=slug, is_active=True)
        serializer = MeetingBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        start_time = data['start_time']
        duration_minutes = data['duration_minutes']
        end_time = start_time + timedelta(minutes=duration_minutes)

        # Convert to host timezone before stripping tzinfo for comparison
        if start_time.tzinfo:
            from zoneinfo import ZoneInfo as _ZoneInfo
            try:
                host_tz = _ZoneInfo(profile.timezone)
            except Exception:
                host_tz = _ZoneInfo('UTC')
            start_naive = start_time.astimezone(host_tz).replace(tzinfo=None)
        else:
            start_naive = start_time

        # Validate the slot is still available
        target_date = start_naive.date()
        available = compute_available_slots(profile, target_date, duration_minutes)
        slot_match = any(
            s['start_time'] == start_naive.isoformat()
            for s in available
        )
        if not slot_match:
            return Response({'error': 'This time slot is no longer available.'}, status=400)

        # Validate duration is offered
        if duration_minutes not in profile.durations_offered:
            return Response({'error': 'This duration is not offered.'}, status=400)

        # Create Daily.co room
        room_name = f"wf-meet-{uuid.uuid4().hex[:12]}"
        try:
            room = create_room(room_name, duration_minutes, start_naive)
        except Exception as e:
            logger.error(f"Failed to create Daily.co room: {e}")
            room = {'name': room_name, 'url': ''}

        # Create booking
        booking = MeetingBooking.objects.create(
            meeting_profile=profile,
            guest_name=data['guest_name'],
            guest_email=data['guest_email'],
            guest_notes=data.get('guest_notes', ''),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            timezone=data['timezone'],
            status='confirmed',
            daily_room_name=room.get('name', ''),
            daily_room_url=room.get('url', ''),
        )

        result = MeetingBookingPublicSerializer(booking).data
        result['cancel_token'] = str(booking.cancel_token)
        return Response(result, status=201)


class MeetingBookingDetailView(APIView):
    """GET /meet/booking/:booking_id/ — Booking details for confirmation/room page."""
    permission_classes = [AllowAny]

    def get(self, request, booking_id):
        booking = get_object_or_404(MeetingBooking, id=booking_id)
        serializer = MeetingBookingPublicSerializer(booking)
        return Response(serializer.data)


class MeetingBookingCancelView(APIView):
    """POST /meet/booking/:booking_id/cancel/ — Cancel via cancel_token."""
    permission_classes = [AllowAny]

    def post(self, request, booking_id):
        booking = get_object_or_404(MeetingBooking, id=booking_id)
        cancel_token = request.data.get('cancel_token')

        if str(booking.cancel_token) != str(cancel_token):
            return Response({'error': 'Invalid cancel token'}, status=403)

        if booking.status == 'cancelled':
            return Response({'error': 'Booking already cancelled'}, status=400)

        booking.status = 'cancelled'
        booking.save(update_fields=['status', 'updated_at'])

        # Delete Daily.co room
        if booking.daily_room_name:
            try:
                delete_room(booking.daily_room_name)
            except Exception:
                pass

        return Response({'status': 'cancelled'})


class MeetingGuestTokenView(APIView):
    """GET /meet/room/:booking_id/token/ — Generate Daily.co guest token."""
    permission_classes = [AllowAny]

    def get(self, request, booking_id):
        booking = get_object_or_404(MeetingBooking, id=booking_id)

        if booking.status not in ['confirmed', 'pending']:
            return Response({'error': 'Meeting is not active'}, status=400)

        if not booking.daily_room_name:
            return Response({'error': 'No video room configured'}, status=400)

        try:
            token = generate_meeting_token(
                booking.daily_room_name,
                booking.guest_name,
                is_owner=False
            )
            return Response({
                'token': token,
                'room_url': booking.daily_room_url,
                'room_name': booking.daily_room_name,
            })
        except Exception as e:
            logger.error(f"Failed to generate guest token: {e}")
            return Response({'error': 'Failed to generate meeting token'}, status=500)


# ============================================================
# Admin Endpoints (IsAuthenticated + SuperUser)
# ============================================================

class AdminMeetingProfileView(APIView):
    """GET/PUT /admin/meetings/profile/ — Get or update own meeting profile."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def get(self, request):
        profile, created = MeetingProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'slug': request.user.username.lower().replace(' ', '-'),
                'headline': f"Book a call with {request.user.first_name or request.user.username}",
                'durations_offered': [15, 30, 60],
            }
        )
        serializer = MeetingProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):

        profile, _ = MeetingProfile.objects.get_or_create(
            user=request.user,
            defaults={
                'slug': request.user.username.lower().replace(' ', '-'),
                'durations_offered': [15, 30, 60],
            }
        )
        serializer = MeetingProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminMeetingAvailabilityView(APIView):
    """GET/POST/DELETE /admin/meetings/availability/"""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def _get_profile(self, user):
        return MeetingProfile.objects.filter(user=user).first()

    def get(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)
        availabilities = profile.availabilities.all()
        serializer = MeetingAvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        serializer = MeetingAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meeting_profile=profile)
        return Response(serializer.data, status=201)

    def delete(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        avail_id = request.data.get('id') or request.query_params.get('id')
        if not avail_id:
            return Response({'error': 'id is required'}, status=400)

        try:
            avail = MeetingAvailability.objects.get(id=avail_id, meeting_profile=profile)
            avail.delete()
            return Response({'status': 'deleted'})
        except MeetingAvailability.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminMeetingOverridesView(APIView):
    """GET/POST/DELETE /admin/meetings/overrides/"""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def _get_profile(self, user):
        return MeetingProfile.objects.filter(user=user).first()

    def get(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)
        overrides = profile.date_overrides.all()
        serializer = MeetingDateOverrideSerializer(overrides, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        serializer = MeetingDateOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meeting_profile=profile)
        return Response(serializer.data, status=201)

    def delete(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        override_id = request.data.get('id') or request.query_params.get('id')
        if not override_id:
            return Response({'error': 'id is required'}, status=400)

        try:
            override = MeetingDateOverride.objects.get(id=override_id, meeting_profile=profile)
            override.delete()
            return Response({'status': 'deleted'})
        except MeetingDateOverride.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class AdminMeetingBookingsView(APIView):
    """GET /admin/meetings/bookings/ — List bookings with filters."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.view']

    def get(self, request):
        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response([])

        bookings = MeetingBooking.objects.filter(meeting_profile=profile)

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            bookings = bookings.filter(status=status_filter)

        date_from = request.query_params.get('date_from')
        if date_from:
            bookings = bookings.filter(start_time__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            bookings = bookings.filter(start_time__date__lte=date_to)

        upcoming = request.query_params.get('upcoming')
        if upcoming == 'true':
            bookings = bookings.filter(start_time__gte=datetime.utcnow(), status__in=['pending', 'confirmed'])

        serializer = MeetingBookingSerializer(bookings[:50], many=True)
        return Response(serializer.data)


class AdminMeetingBookingUpdateView(APIView):
    """PATCH /admin/meetings/bookings/:id/ — Update booking status."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def patch(self, request, booking_id):
        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        booking = get_object_or_404(MeetingBooking, id=booking_id, meeting_profile=profile)

        new_status = request.data.get('status')
        if new_status not in ['cancelled', 'completed']:
            return Response({'error': 'Status must be cancelled or completed'}, status=400)

        booking.status = new_status
        booking.save(update_fields=['status', 'updated_at'])

        if new_status == 'cancelled' and booking.daily_room_name:
            try:
                delete_room(booking.daily_room_name)
            except Exception:
                pass

        serializer = MeetingBookingSerializer(booking)
        return Response(serializer.data)


class AdminMeetingHostTokenView(APIView):
    """GET /admin/meetings/bookings/:id/host-token/ — Generate host token."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.view']

    def get(self, request, booking_id):
        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        booking = get_object_or_404(MeetingBooking, id=booking_id, meeting_profile=profile)

        # If room was never created or URL is missing, attempt to create one now
        if not booking.daily_room_name or not booking.daily_room_url:
            room_name = booking.daily_room_name or f"wf-meet-{uuid.uuid4().hex[:12]}"
            start_naive = booking.start_time.replace(tzinfo=None) if booking.start_time.tzinfo else booking.start_time
            try:
                room = create_room(room_name, booking.duration_minutes, start_naive)
                booking.daily_room_name = room.get('name', room_name)
                booking.daily_room_url = room.get('url', '')
                booking.save(update_fields=['daily_room_name', 'daily_room_url', 'updated_at'])
                logger.info(f"Recovered missing room for booking {booking_id}: {booking.daily_room_url}")
            except Exception as e:
                logger.error(f"Failed to create room for booking {booking_id}: {e}")
                return Response({'error': 'Failed to create video room. Please try again.'}, status=500)

        if not booking.daily_room_url:
            return Response({'error': 'No video room configured'}, status=400)

        host_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        try:
            token = generate_meeting_token(
                booking.daily_room_name,
                host_name,
                is_owner=True
            )
            return Response({
                'token': token,
                'room_url': booking.daily_room_url,
                'room_name': booking.daily_room_name,
            })
        except Exception as e:
            logger.error(f"Failed to generate host token: {e}")
            return Response({'error': 'Failed to generate meeting token'}, status=500)


class AdminMeetingBookingCreateByAdminView(APIView):
    """POST /admin/meetings/bookings/create/ — Admin creates a booking and optionally sends an invitation email."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def post(self, request):
        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        serializer = AdminMeetingBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        start_time = data['start_time']
        duration_minutes = data['duration_minutes']
        end_time = start_time + timedelta(minutes=duration_minutes)

        # Create Daily.co room
        room_name = f"wf-meet-{uuid.uuid4().hex[:12]}"
        try:
            start_naive = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
            room = create_room(room_name, duration_minutes, start_naive)
        except Exception as e:
            logger.error(f"Failed to create Daily.co room: {e}")
            room = {'name': room_name, 'url': ''}

        # Create booking
        booking = MeetingBooking.objects.create(
            meeting_profile=profile,
            guest_name=data['guest_name'],
            guest_email=data['guest_email'],
            guest_notes=data.get('guest_notes', ''),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            timezone=data['timezone'],
            status='confirmed',
            daily_room_name=room.get('name', ''),
            daily_room_url=room.get('url', ''),
        )

        # Send invitation email if requested
        if data.get('send_email', True):
            try:
                from api.services.email_service import EmailService
                from django.conf import settings as dj_settings

                host_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                meet_url = getattr(dj_settings, 'MEET_URL', 'https://meet.we-fund.com')
                cancel_url = f"{meet_url}/booking/{booking.id}?cancel_token={booking.cancel_token}"
                room_url = f"{meet_url}/room/{booking.id}"

                context = {
                    'guest_name': booking.guest_name,
                    'host_name': host_name,
                    'date': start_time.strftime('%A, %B %d, %Y'),
                    'time': start_time.strftime('%H:%M'),
                    'end_time': end_time.strftime('%H:%M'),
                    'duration': duration_minutes,
                    'timezone': data['timezone'],
                    'room_url': room_url,
                    'cancel_url': cancel_url,
                    'notes': booking.guest_notes,
                }

                html_message = EmailService.render_template('emails/meeting/invitation.html', context)
                from django.core.mail import EmailMultiAlternatives
                msg = EmailMultiAlternatives(
                    subject=f"WeFund | Meeting Invitation from {host_name}",
                    body="",
                    from_email=dj_settings.DEFAULT_FROM_EMAIL,
                    to=[booking.guest_email],
                )
                msg.attach_alternative(html_message, "text/html")
                msg.send()
                logger.info("Meeting invitation email sent to %s for booking %s", booking.guest_email, booking.id)
                EmailService.log_email(
                    f"WeFund | Meeting Invitation from {host_name}",
                    booking.guest_email,
                    body_html=html_message,
                    category='meeting',
                )
            except Exception as e:
                logger.exception("Failed to send meeting invitation email to %s: %s", booking.guest_email, e)

        result = MeetingBookingSerializer(booking).data
        return Response(result, status=201)


class AdminInstantMeetingView(APIView):
    """POST /admin/meetings/instant-start/ — Instantly create a Daily.co room and return host token."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def post(self, request):
        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        now = dj_timezone.now()
        duration_minutes = 60
        room_name = f"wf-instant-{uuid.uuid4().hex[:12]}"

        try:
            room = create_room(room_name, duration_minutes, now.replace(tzinfo=None))
        except Exception as e:
            logger.error(f"Failed to create instant Daily.co room: {e}")
            return Response({'error': 'Failed to create video room'}, status=500)

        booking = MeetingBooking.objects.create(
            meeting_profile=profile,
            guest_name='Instant Meeting',
            guest_email='',
            start_time=now,
            end_time=now + timedelta(minutes=duration_minutes),
            duration_minutes=duration_minutes,
            timezone=profile.timezone,
            status='confirmed',
            daily_room_name=room.get('name', ''),
            daily_room_url=room.get('url', ''),
        )

        host_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        try:
            token = generate_meeting_token(room.get('name', ''), host_name, is_owner=True)
        except Exception as e:
            logger.error(f"Failed to generate host token for instant meeting: {e}")
            return Response({'error': 'Room created but failed to generate host token'}, status=500)

        return Response({
            'booking_id': str(booking.id),
            'token': token,
            'room_url': room.get('url', ''),
            'room_name': room.get('name', ''),
            'guest_link': room.get('url', ''),
        }, status=201)


class AdminGoogleAuthURLView(APIView):
    """GET /admin/meetings/google/auth-url/ — Get Google OAuth URL."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def get(self, request):

        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'Create a meeting profile first'}, status=400)

        url = get_auth_url(str(profile.id))
        return Response({'auth_url': url})


class AdminGoogleCallbackView(APIView):
    """GET /admin/meetings/google/callback/ — OAuth callback handler."""
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')

        if not code or not state:
            return Response({'error': 'Missing code or state'}, status=400)

        try:
            profile = handle_callback(code, state)
            # Redirect to CRM settings
            from django.conf import settings as dj_settings
            crm_url = getattr(dj_settings, 'FRONTEND_URL', 'https://crm.we-fund.com')
            from django.http import HttpResponseRedirect
            return HttpResponseRedirect(f'{crm_url}/meetings?google=connected')
        except Exception as e:
            logger.error(f"Google OAuth callback failed: {e}")
            return Response({'error': 'OAuth callback failed'}, status=500)


class AdminGoogleDisconnectView(APIView):
    """POST /admin/meetings/google/disconnect/ — Remove Google Calendar."""
    permission_classes = [HasPermission]
    required_permissions = ['meetings.manage']

    def post(self, request):

        profile = MeetingProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'No meeting profile found'}, status=404)

        profile.google_calendar_connected = False
        profile.google_access_token = ''
        profile.google_refresh_token = ''
        profile.google_token_expiry = None
        profile.google_calendar_id = ''
        profile.save()

        return Response({'status': 'disconnected'})
