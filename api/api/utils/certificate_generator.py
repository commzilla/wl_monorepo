# api/utils/certificate_generator.py

import io
import os
import uuid
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from .bunnycdn import upload_to_bunnycdn


CERTIFICATE_TEMPLATES = {
    "live_account": {
        "file": "Live Account Certificate.png",
        "design_size": {"w": 1730, "h": 1720},
        "name": {"x": 990, "y": 900, "size": 50, "anchor": "mm"},
        "date": {"x": 310, "y": 1410, "size": 36, "anchor": "lm"},
    },
    "phase_one": {
        "file": "phase_one.jpg",
        "design_size": {"w": 1730, "h": 1720},
        "name": {"x": 865, "y": 925, "size": 63, "anchor": "mm"},
        "date": {"x": 320, "y": 1410, "size": 25, "anchor": "mb"},
    },
    "phase_two": {
        "file": "phase_two.jpg",
        "design_size": {"w": 1730, "h": 1720},
        "name": {"x": 865, "y": 925, "size": 63, "anchor": "mm"},
        "date": {"x": 320, "y": 1410, "size": 25, "anchor": "mb"},
    },
    "payout": {
        "file": "payout_certificate.jpg",
        "design_size": {"w": 1730, "h": 1720},
        "name": {"x": 865, "y": 640, "size": 64, "anchor": "mm"},
        "profitshare": {"x": 865, "y": 972, "size": 58, "anchor": "mm"},
        "date": {"x": 305, "y": 1435, "size": 25, "anchor": "mb"},
    },
    "funded": {
        "file": "official_funded.jpg",
        "design_size": {"w": 1730, "h": 1720},
        "name": {"x": 865, "y": 925, "size": 63, "anchor": "mm"},
        "date": {"x": 320, "y": 1410, "size": 30, "anchor": "mb"},
    },
}


# === Helper functions ===

def _load_font(font_path, size):
    return ImageFont.truetype(font_path, size)


def _draw_text(draw, text, x, y, font, fill, anchor="lt"):
    """Support flexible anchor positioning similar to payout logic."""
    bbox = draw.textbbox((0, 0), text, font=font)
    wtxt, htxt = bbox[2] - bbox[0], bbox[3] - bbox[1]

    if anchor in ("mm", "center"):
        x0, y0 = x - wtxt / 2, y - htxt / 2
    elif anchor == "mb":
        x0, y0 = x - wtxt / 2, y - htxt
    elif anchor == "lm":
        x0, y0 = x, y - htxt / 2
    elif anchor == "rm":
        x0, y0 = x - wtxt, y - htxt / 2
    else:  # lt default
        x0, y0 = x, y

    draw.text((x0, y0), text, font=font, fill=fill)


# === Main generator ===

def generate_and_upload_certificate(
    template_key: str,
    trader_name: str,
    issue_date: datetime = None,
    font_path: str = None,
    bunnycdn_subfolder: str = "certificates",
    extra_text: str = None,
) -> dict:
    """
    Generate and upload certificate with accurate positioning and scaling.
    """
    if template_key not in CERTIFICATE_TEMPLATES:
        raise ValueError(f"Unknown certificate template: {template_key}")

    tpl = CERTIFICATE_TEMPLATES[template_key]
    issue_date = issue_date or timezone.now()
    date_str = issue_date.strftime("%B %d, %Y")

    base_image_path = os.path.join(settings.BASE_DIR, "static", "certificates", tpl["file"])
    font_path = font_path or os.path.join(settings.BASE_DIR, "static", "fonts", "Roboto-Bold.ttf")

    base = Image.open(base_image_path).convert("RGBA")
    draw = ImageDraw.Draw(base)
    fill_color = (255, 255, 255, 255)

    base_w, base_h = base.size
    design_w = tpl.get("design_size", {}).get("w", base_w)
    design_h = tpl.get("design_size", {}).get("h", base_h)

    def scale_xy(x, y):
        return (x * base_w / design_w, y * base_h / design_h)

    # === Draw Name ===
    name_cfg = tpl["name"]
    name_font = _load_font(font_path, name_cfg["size"])
    nx, ny = scale_xy(name_cfg["x"], name_cfg["y"])
    _draw_text(draw, trader_name, nx, ny, name_font, fill_color, anchor=name_cfg.get("anchor", "lt"))

    # === Draw Date ===
    date_cfg = tpl["date"]
    date_font = _load_font(font_path, date_cfg["size"])
    dx, dy = scale_xy(date_cfg["x"], date_cfg["y"])
    _draw_text(draw, date_str, dx, dy, date_font, fill_color, anchor=date_cfg.get("anchor", "lt"))

    # === Optional Profit Share (for payout only) ===
    if template_key == "payout" and "profitshare" in tpl and extra_text:
        ps_cfg = tpl["profitshare"]
        ps_font = _load_font(font_path, ps_cfg["size"])
        px, py = scale_xy(ps_cfg["x"], ps_cfg["y"])
        _draw_text(draw, extra_text, px, py, ps_font, fill_color, anchor=ps_cfg.get("anchor", "mm"))

    # === Save Files ===
    png_buffer = io.BytesIO()
    base.save(png_buffer, format="PNG")
    png_buffer.seek(0)

    unique_id = uuid.uuid4().hex[:8]
    base_filename = f"{bunnycdn_subfolder}/{template_key}_{unique_id}"

    image_url = upload_to_bunnycdn(png_buffer, f"{base_filename}.png")

    pdf_buffer = io.BytesIO()
    base.convert("RGB").save(pdf_buffer, format="PDF", resolution=300.0)
    pdf_buffer.seek(0)
    pdf_url = upload_to_bunnycdn(pdf_buffer, f"{base_filename}.pdf")

    return {
        "template": template_key,
        "image_url": image_url,
        "pdf_url": pdf_url,
    }
