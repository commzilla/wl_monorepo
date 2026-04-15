# wefund/webhooks/utils.py
import requests
from django.conf import settings

WC_BASE_URL = f"{settings.WC_API_URL}/webhooks"
WC_AUTH = (settings.WC_CONSUMER_KEY, settings.WC_CONSUMER_SECRET)

def wc_list_webhooks():
    return requests.get(WC_BASE_URL, auth=WC_AUTH).json()

def wc_get_webhook(wc_id):
    return requests.get(f"{WC_BASE_URL}/{wc_id}", auth=WC_AUTH).json()

def wc_create_webhook(data):
    return requests.post(WC_BASE_URL, auth=WC_AUTH, json=data).json()

def wc_update_webhook(wc_id, data):
    return requests.put(f"{WC_BASE_URL}/{wc_id}", auth=WC_AUTH, json=data).json()

def wc_delete_webhook(wc_id):
    return requests.delete(f"{WC_BASE_URL}/{wc_id}", auth=WC_AUTH).json()
