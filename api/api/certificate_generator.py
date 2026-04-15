# certificate_generator.py

import os
from datetime import datetime

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont


def generate_certificate_image(
    *,
    trader_name: str,
    issue_date: datetime = None,
    base_image_path: str = None,
    font_path: str = None,
    font_size: int = 36,
    name_x: int = 1200,
    name_y: int = 923,
    date_x: int = 400,
    date_y: int = 1359,
) -> Image.Image:
    if not base_image_path:
        base_image_path = os.path.join(settings.BASE_DIR, "static", "certificates", "Live Account Certificate.png")

    if not font_path:
        font_path = os.path.join(settings.BASE_DIR, "static", "fonts", "Roboto-Bold.ttf")

    issue_date = issue_date or timezone.now()
    date_str = issue_date.strftime("%B %d, %Y")

    base = Image.open(base_image_path).convert("RGBA")
    draw = ImageDraw.Draw(base)
    font = ImageFont.truetype(font_path, font_size)

    fill_color = (255, 255, 255, 255)
    draw.text((name_x, name_y), trader_name, font=font, fill=fill_color)
    draw.text((date_x, date_y), date_str, font=font, fill=fill_color)

    return base
