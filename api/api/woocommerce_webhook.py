import os
import requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .permissions import HasPermission

# WooCommerce API config
WC_API_URL = settings.WC_API_URL  # e.g. "https://yourstore.com/wp-json/wc/v3"
WC_CONSUMER_KEY = settings.WC_CONSUMER_KEY
WC_CONSUMER_SECRET = settings.WC_CONSUMER_SECRET

# Your specific webhook
WEBHOOK_ID = int(os.getenv("WEBHOOK_ID", 0))

def wc_request(method, endpoint, data=None):
    """Helper to call WooCommerce API"""
    url = f"{WC_API_URL}{endpoint}"
    auth = (WC_CONSUMER_KEY, WC_CONSUMER_SECRET)
    response = requests.request(method, url, auth=auth, json=data)
    response.raise_for_status()
    return response.json()

@api_view(["GET"])
@permission_classes([HasPermission])
def get_webhook_status(request):
    """Fetch current webhook status"""
    try:
        webhook = wc_request("GET", f"/webhooks/{WEBHOOK_ID}")
        return Response({"id": webhook["id"], "status": webhook["status"]})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


get_webhook_status.cls.required_permissions = ['orders.view']


@api_view(["POST"])
@permission_classes([HasPermission])
def enable_webhook(request):
    """Enable (activate) webhook"""
    try:
        webhook = wc_request("PUT", f"/webhooks/{WEBHOOK_ID}", {"status": "active"})
        return Response({"id": webhook["id"], "status": webhook["status"]})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


enable_webhook.cls.required_permissions = ['config.edit']


@api_view(["POST"])
@permission_classes([HasPermission])
def disable_webhook(request):
    """Disable (pause) webhook"""
    try:
        webhook = wc_request("PUT", f"/webhooks/{WEBHOOK_ID}", {"status": "paused"})
        return Response({"id": webhook["id"], "status": webhook["status"]})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


disable_webhook.cls.required_permissions = ['config.edit']
