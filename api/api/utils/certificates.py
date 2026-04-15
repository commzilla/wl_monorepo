# api/utils/certificates.py

import os
from django.conf import settings

def list_available_certificate_images():
    cert_dir = os.path.join(settings.BASE_DIR, "static", "certificates")
    return [
        f for f in os.listdir(cert_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
    ]
