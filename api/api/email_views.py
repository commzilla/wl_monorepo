"""
Email Admin Views.

CRM-facing endpoints for managing email templates and viewing email logs.
All endpoints require HasPermission with appropriate permission codes.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import Template, Context
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from api.permissions import HasPermission
from api.serializers import EmailTemplateSerializer, EmailLogSerializer
from api.services.email_service import EmailService
from wefund.models import EmailTemplate, EmailLog

logger = logging.getLogger(__name__)


class EmailTemplatePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmailLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for email templates.

    GET    /api/admin/email-templates/              — list all templates
    GET    /api/admin/email-templates/{id}/          — retrieve a template
    PATCH  /api/admin/email-templates/{id}/          — update a template
    POST   /api/admin/email-templates/{id}/preview/  — render preview with sample data
    POST   /api/admin/email-templates/{id}/send-test/ — send a test email
    """
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [HasPermission]
    required_permissions = ['email.manage']
    pagination_class = EmailTemplatePagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'subject', 'template_path', 'description']
    ordering_fields = ['category', 'name', 'updated_at', 'created_at']
    ordering = ['category', 'name']
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='preview')
    def preview(self, request, pk=None):
        """
        Render the template with sample_context (or override context from body).
        Returns the rendered HTML string.
        """
        template_obj = self.get_object()
        context_override = request.data.get('context', None)
        context = context_override if context_override else template_obj.sample_context

        try:
            tpl = Template(template_obj.body_html)
            rendered = tpl.render(Context(context))
            return Response({
                'rendered_html': rendered,
                'variables': template_obj.variables,
                'context_used': context,
            })
        except Exception as e:
            logger.exception("Template preview failed for %s: %s", template_obj.template_path, e)
            return Response(
                {'error': f'Template rendering failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='send-test')
    def send_test(self, request, pk=None):
        """
        Send a test email using the template with sample_context.
        Requires `to_email` in the request body.
        """
        template_obj = self.get_object()
        to_email = request.data.get('to_email')

        if not to_email:
            return Response(
                {'error': 'to_email is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        context = request.data.get('context', None) or template_obj.sample_context
        subject = template_obj.subject or f'[TEST] {template_obj.name}'

        try:
            tpl = Template(template_obj.body_html)
            rendered_html = tpl.render(Context(context))

            msg = EmailMultiAlternatives(
                subject=f'[TEST] {subject}',
                body='',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            msg.attach_alternative(rendered_html, 'text/html')
            msg.send()

            EmailService.log_email(
                subject=f'[TEST] {subject}',
                to_email=to_email,
                body_html=rendered_html,
                category='admin',
                user=request.user,
                status='sent',
            )

            return Response({
                'message': f'Test email sent to {to_email}',
                'subject': f'[TEST] {subject}',
            })
        except Exception as e:
            logger.exception("Test email send failed: %s", e)
            EmailService.log_email(
                subject=f'[TEST] {subject}',
                to_email=to_email,
                category='admin',
                user=request.user,
                status='failed',
                error_message=str(e),
            )
            return Response(
                {'error': f'Failed to send test email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin endpoints for email logs (read-only).

    GET /api/admin/email-logs/      — list all email logs
    GET /api/admin/email-logs/{id}/ — retrieve a single log entry
    """
    queryset = EmailLog.objects.select_related('user').all()
    serializer_class = EmailLogSerializer
    permission_classes = [HasPermission]
    required_permissions = ['email.view']
    pagination_class = EmailLogPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'status']
    search_fields = ['to_email', 'subject']
    ordering_fields = ['created_at', 'sent_at', 'status']
    ordering = ['-created_at']
