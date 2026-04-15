"""
Advanced Monitoring and Analytics Views for WordPress Integration.

This module provides comprehensive monitoring, logging, and analytics views
for the WordPress plugin integration with enhanced error tracking.

Classes:
    APIMonitoringMixin: Mixin to add monitoring capabilities to API views
    APIAnalyticsView: Admin view for API analytics and monitoring data

Functions:
    monitor_api_performance: Decorator to monitor API endpoint performance
    clear_old_logs: Admin function to clear old logs
    export_logs: Admin function to export logs in CSV format
"""

import json
import logging
import time
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.utils import timezone
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from api.permissions import HasPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from wefund.models import APIRequestLog, WebhookProcessingLog

logger = logging.getLogger(__name__)


class APIMonitoringMixin:
    """
    Mixin to add monitoring capabilities to API views.
    """
    
    def dispatch(self, request, *args, **kwargs):
        start_time = time.time()
        
        # Log request start
        webhook_id = self.generate_webhook_id(request)
        self.log_webhook_stage(webhook_id, 'started', 'Request received', {
            'endpoint': request.path,
            'method': request.method,
            'ip': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500]
        })
        
        try:
            response = super().dispatch(request, *args, **kwargs)
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000
            
            # Log successful processing
            self.log_webhook_stage(webhook_id, 'success', 'Request completed successfully', {
                'status_code': response.status_code,
                'processing_time_ms': processing_time
            })
            
            # Store API request log
            self.store_api_request_log(request, response, processing_time)
            
            return response
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            
            # Log error
            self.log_webhook_stage(webhook_id, 'failed', f'Request failed: {str(e)}', {
                'error_type': type(e).__name__,
                'error_message': str(e),
                'processing_time_ms': processing_time
            })
            
            # Store error log
            error_response = JsonResponse({
                'error': 'Internal server error',
                'webhook_id': webhook_id
            }, status=500)
            
            self.store_api_request_log(request, error_response, processing_time, str(e))
            
            raise
    
    def generate_webhook_id(self, request):
        """Generate unique webhook ID for tracking."""
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        ip_hash = hash(request.META.get('REMOTE_ADDR', ''))
        return f"wh_{timestamp}_{abs(ip_hash) % 10000:04d}"
    
    def log_webhook_stage(self, webhook_id: str, status: str, stage: str, details: Dict[str, Any]):
        """Log webhook processing stage."""
        try:
            WebhookProcessingLog.objects.create(
                webhook_id=webhook_id,
                processing_stage=stage,
                status=status,
                details=details
            )
        except Exception as e:
            logger.error(f"Failed to log webhook stage: {e}")
    
    def store_api_request_log(self, request, response, processing_time: float, error_message: str = ""):
        """Store API request log for analytics."""
        try:
            # Sanitize request data (remove sensitive information)
            request_data = self.sanitize_request_data(request)
            
            APIRequestLog.objects.create(
                endpoint=request.path,
                method=request.method,
                ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000],
                request_data=request_data,
                response_status=response.status_code,
                response_time_ms=processing_time,
                error_message=error_message
            )
        except Exception as e:
            logger.error(f"Failed to store API request log: {e}")
    
    def sanitize_request_data(self, request):
        """Remove sensitive data from request for logging."""
        try:
            if hasattr(request, 'data') and request.data:
                data = dict(request.data)
                
                # Remove sensitive fields
                sensitive_fields = [
                    'password', 'token', 'secret', 'key', 'api_key',
                    'plugin_key', 'billing', 'payment_method'
                ]
                
                for field in sensitive_fields:
                    if field in data:
                        data[field] = '[REDACTED]'
                
                # Limit data size
                return {k: str(v)[:500] for k, v in data.items()}
            
            return {}
        except Exception:
            return {'error': 'Failed to parse request data'}


def monitor_api_performance(func):
    """
    Decorator to monitor API endpoint performance and log metrics.
    """
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        start_time = time.time()
        endpoint = request.path
        method = request.method
        
        try:
            # Execute the original function
            response = func(self, request, *args, **kwargs)
            
            # Calculate metrics
            processing_time = (time.time() - start_time) * 1000
            
            # Store performance metrics
            cache_key = f"api_metrics_{endpoint}_{method}"
            metrics = cache.get(cache_key, {
                'total_requests': 0,
                'total_time': 0,
                'avg_time': 0,
                'success_count': 0,
                'error_count': 0
            })
            
            metrics['total_requests'] += 1
            metrics['total_time'] += processing_time
            metrics['avg_time'] = metrics['total_time'] / metrics['total_requests']
            
            if 200 <= response.status_code < 400:
                metrics['success_count'] += 1
            else:
                metrics['error_count'] += 1
            
            # Cache for 1 hour
            cache.set(cache_key, metrics, 3600)
            
            # Log performance if slow
            if processing_time > 5000:  # 5 seconds
                logger.warning(f"Slow API response: {method} {endpoint} took {processing_time:.2f}ms")
            
            return response
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            logger.error(f"API error in {method} {endpoint}: {str(e)} (took {processing_time:.2f}ms)")
            raise
    
    return wrapper


class APIAnalyticsView(APIView):
    """
    Provide API analytics and monitoring data for administrators.
    """
    permission_classes = [HasPermission]
    required_permissions = ['system.view_health']
    
    def get(self, request, *args, **kwargs):
        """Get comprehensive API analytics."""
        try:
            # Time range filter
            days = int(request.GET.get('days', 7))
            start_date = timezone.now() - timedelta(days=days)
            
            # Request statistics
            request_stats = self.get_request_statistics(start_date)
            
            # Error analysis
            error_analysis = self.get_error_analysis(start_date)
            
            # Performance metrics
            performance_metrics = self.get_performance_metrics()
            
            # Webhook processing stats
            webhook_stats = self.get_webhook_statistics(start_date)
            
            # Rate limiting stats
            rate_limit_stats = self.get_rate_limit_statistics(start_date)
            
            return Response({
                'period': {
                    'days': days,
                    'start_date': start_date.isoformat(),
                    'end_date': timezone.now().isoformat()
                },
                'request_statistics': request_stats,
                'error_analysis': error_analysis,
                'performance_metrics': performance_metrics,
                'webhook_statistics': webhook_stats,
                'rate_limiting': rate_limit_stats,
                'system_health': self.get_system_health()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception("Error generating API analytics")
            return Response({
                'error': 'Failed to generate analytics',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_request_statistics(self, start_date):
        """Get request statistics for the specified period."""
        logs = APIRequestLog.objects.filter(created_at__gte=start_date)
        
        total_requests = logs.count()
        successful_requests = logs.filter(response_status__lt=400).count()
        error_requests = logs.filter(response_status__gte=400).count()
        
        # Requests by endpoint
        endpoint_stats = {}
        for log in logs.values('endpoint').annotate(
            count=models.Count('id'),
            avg_time=models.Avg('response_time_ms')
        ):
            endpoint_stats[log['endpoint']] = {
                'count': log['count'],
                'avg_response_time': round(log['avg_time'] or 0, 2)
            }
        
        # Requests by status code
        status_stats = {}
        for log in logs.values('response_status').annotate(count=models.Count('id')):
            status_stats[str(log['response_status'])] = log['count']
        
        return {
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'error_requests': error_requests,
            'success_rate': round((successful_requests / total_requests * 100) if total_requests > 0 else 0, 2),
            'by_endpoint': endpoint_stats,
            'by_status_code': status_stats
        }
    
    def get_error_analysis(self, start_date):
        """Analyze error patterns and frequencies."""
        error_logs = APIRequestLog.objects.filter(
            created_at__gte=start_date,
            response_status__gte=400
        )
        
        # Most common errors
        common_errors = {}
        for log in error_logs.values('error_message').annotate(count=models.Count('id')):
            if log['error_message']:
                common_errors[log['error_message'][:100]] = log['count']
        
        # Errors by endpoint
        endpoint_errors = {}
        for log in error_logs.values('endpoint').annotate(count=models.Count('id')):
            endpoint_errors[log['endpoint']] = log['count']
        
        return {
            'total_errors': error_logs.count(),
            'common_errors': dict(sorted(common_errors.items(), key=lambda x: x[1], reverse=True)[:10]),
            'by_endpoint': endpoint_errors
        }
    
    def get_performance_metrics(self):
        """Get cached performance metrics."""
        performance_data = {}
        
        # Get all cached metrics
        cache_keys = cache.keys('api_metrics_*') if hasattr(cache, 'keys') else []
        
        for key in cache_keys:
            metrics = cache.get(key)
            if metrics:
                endpoint = key.replace('api_metrics_', '')
                performance_data[endpoint] = metrics
        
        return performance_data
    
    def get_webhook_statistics(self, start_date):
        """Get webhook processing statistics."""
        webhook_logs = WebhookProcessingLog.objects.filter(created_at__gte=start_date)
        
        total_webhooks = webhook_logs.values('webhook_id').distinct().count()
        successful_webhooks = webhook_logs.filter(status='success').values('webhook_id').distinct().count()
        failed_webhooks = webhook_logs.filter(status='failed').values('webhook_id').distinct().count()
        
        # Processing stages
        stage_stats = {}
        for log in webhook_logs.values('processing_stage').annotate(count=models.Count('id')):
            stage_stats[log['processing_stage']] = log['count']
        
        # Average processing time
        avg_processing_time = webhook_logs.filter(
            processing_time_ms__isnull=False
        ).aggregate(avg_time=models.Avg('processing_time_ms'))['avg_time']
        
        return {
            'total_webhooks': total_webhooks,
            'successful_webhooks': successful_webhooks,
            'failed_webhooks': failed_webhooks,
            'success_rate': round((successful_webhooks / total_webhooks * 100) if total_webhooks > 0 else 0, 2),
            'avg_processing_time_ms': round(avg_processing_time or 0, 2),
            'by_stage': stage_stats
        }
    
    def get_rate_limit_statistics(self, start_date):
        """Get rate limiting statistics."""
        # This would integrate with your rate limiting system
        # For now, return basic IP-based statistics
        
        ip_stats = {}
        logs = APIRequestLog.objects.filter(created_at__gte=start_date)
        
        for log in logs.values('ip_address').annotate(count=models.Count('id')):
            ip_stats[log['ip_address']] = log['count']
        
        # Find potential abuse (high request counts)
        high_traffic_ips = {ip: count for ip, count in ip_stats.items() if count > 1000}
        
        return {
            'unique_ips': len(ip_stats),
            'high_traffic_ips': high_traffic_ips,
            'total_requests_by_ip': dict(sorted(ip_stats.items(), key=lambda x: x[1], reverse=True)[:10])
        }
    
    def get_system_health(self):
        """Get current system health indicators."""
        try:
            from django.db import connection
            
            # Database connection test
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_healthy = True
        except Exception:
            db_healthy = False
        
        # Cache test
        try:
            cache.set('health_check', 'ok', 30)
            cache_healthy = cache.get('health_check') == 'ok'
        except Exception:
            cache_healthy = False
        
        # Recent error rate
        recent_logs = APIRequestLog.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=1)
        )
        total_recent = recent_logs.count()
        error_recent = recent_logs.filter(response_status__gte=500).count()
        error_rate = (error_recent / total_recent * 100) if total_recent > 0 else 0
        
        overall_health = 'healthy'
        if not db_healthy or not cache_healthy:
            overall_health = 'critical'
        elif error_rate > 10:
            overall_health = 'degraded'
        elif error_rate > 5:
            overall_health = 'warning'
        
        return {
            'overall_status': overall_health,
            'database': db_healthy,
            'cache': cache_healthy,
            'recent_error_rate': round(error_rate, 2),
            'timestamp': timezone.now().isoformat()
        }


@api_view(['POST'])
@permission_classes([HasPermission])
def clear_old_logs(request):
    """
    Clear old logs to manage database size.
    """
    try:
        days_to_keep = int(request.data.get('days', 30))
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)

        # Clear old API request logs
        api_deleted = APIRequestLog.objects.filter(created_at__lt=cutoff_date).delete()

        # Clear old webhook logs
        webhook_deleted = WebhookProcessingLog.objects.filter(created_at__lt=cutoff_date).delete()

        return Response({
            'message': 'Old logs cleared successfully',
            'api_logs_deleted': api_deleted[0],
            'webhook_logs_deleted': webhook_deleted[0],
            'cutoff_date': cutoff_date.isoformat()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Error clearing old logs")
        return Response({
            'error': 'Failed to clear logs',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


clear_old_logs.cls.required_permissions = ['system.view_health']


@api_view(['GET'])
@permission_classes([HasPermission])
def export_logs(request):
    """
    Export logs in CSV format for external analysis.
    """
    try:
        import csv
        from django.http import HttpResponse

        # Get date range
        days = int(request.GET.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="api_logs_{start_date.strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)

        # Write header
        writer.writerow([
            'Timestamp', 'Endpoint', 'Method', 'IP Address', 'Status Code',
            'Response Time (ms)', 'Error Message', 'User Agent'
        ])

        # Write data
        logs = APIRequestLog.objects.filter(created_at__gte=start_date).order_by('-created_at')

        for log in logs:
            writer.writerow([
                log.created_at.isoformat(),
                log.endpoint,
                log.method,
                log.ip_address,
                log.response_status,
                log.response_time_ms,
                log.error_message,
                log.user_agent[:100]  # Truncate user agent
            ])

        return response

    except Exception as e:
        logger.exception("Error exporting logs")
        return Response({
            'error': 'Failed to export logs',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


export_logs.cls.required_permissions = ['system.view_health']
