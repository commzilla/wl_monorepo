import io
import os
import uuid
from datetime import datetime

import qrcode
from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from .bunnycdn import upload_to_bunnycdn

# Set the original pixel size of the certificate JPG you measured in your editor
# Open the file and check Image > Image Size in Photoshop/Figma export.
PAYOUT_CERTIFICATE_TEMPLATE = {
    "payout": {
        "file": "payout_certificate.jpg",
        "design_size": {"w": 1730, "h": 1720},

        "name":        {"x": 865, "y": 650,  "size": 64, "anchor": "mm"},
        "profitshare": {"x": 865, "y": 972,  "size": 150, "anchor": "mm"},  # value only, e.g. "$2,499.98"

        # Date centered above the small "Date" label
        "date":        {"x": 320, "y": 1425, "size": 30, "anchor": "mb"},   # use A:138 or C:207 if preferred

        # QR code in bottom-right area, mirroring date on the left
        "qr_code":    {"x": 1410, "y": 1425, "size": 200},
    },
}

def _load_font(font_path, size):
    return ImageFont.truetype(font_path, size)

def _scale_xy(x, y, base_w, base_h, design_w, design_h):
    """Scale design-space coordinates to actual image size."""
    sx = base_w / float(design_w)
    sy = base_h / float(design_h)
    return (x * sx, y * sy)

def _draw_text_with_anchor(draw, text, x, y, font, fill, anchor="lt"):
    """
    Anchor options (safe custom set):
      'lt' = left-top (default PIL behavior)
      'lm' = left-middle (vertically centered on y)
      'mm' = middle-center (centered on x,y)
      'rm' = right-middle
      'rb' = right-bottom
      'mb' = middle-bottom
    """
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]

    if anchor in ("mm", "center"):
        x0, y0 = x - w / 2, y - h / 2
    elif anchor in ("lm", "left_middle"):
        x0, y0 = x, y - h / 2
    elif anchor in ("rm", "right_middle"):
        x0, y0 = x - w, y - h / 2
    elif anchor in ("rb", "right_bottom"):
        x0, y0 = x - w, y - h
    elif anchor in ("mb", "middle_bottom"):
        x0, y0 = x - w / 2, y - h
    else:  # 'lt' / fallback
        x0, y0 = x, y

    draw.text((x0, y0), text, font=font, fill=fill)

def generate_and_upload_payout_certificate(
    trader_name: str,
    profit_share_text: str = None,  # e.g. "Net Profit: $1,234.56" or "Profit Share: 80%"
    issue_date: datetime = None,
    font_path: str = None,
    bunnycdn_subfolder: str = "certificates/payouts",
    certificate_id: str = None,
) -> dict:
    print(f"[DEBUG] Generating payout certificate for trader_name='{trader_name}', "
          f"profit_share_text='{profit_share_text}', issue_date='{issue_date}'")

    tpl = PAYOUT_CERTIFICATE_TEMPLATE["payout"]

    issue_date = issue_date or timezone.now()
    date_str = issue_date.strftime("%B %d, %Y")
    print(f"[DEBUG] Using date string: {date_str}")

    base_image_path = os.path.join(settings.BASE_DIR, "static", "certificates", tpl["file"])
    font_path = font_path or os.path.join(settings.BASE_DIR, "static", "fonts", "Inter_24pt-Bold.ttf")
    print(f"[DEBUG] Base image path: {base_image_path}")
    print(f"[DEBUG] Font path: {font_path}")

    # Load image
    try:
        base = Image.open(base_image_path).convert("RGBA")
    except Exception as e:
        print("[ERROR] Failed to open base image:", e)
        raise

    base_w, base_h = base.size
    print(f"[DEBUG] Base image size: {base_w}x{base_h}px")

    design_w = tpl.get("design_size", {}).get("w", base_w)
    design_h = tpl.get("design_size", {}).get("h", base_h)
    print(f"[DEBUG] Design size (for scaling): {design_w}x{design_h}px")

    draw = ImageDraw.Draw(base)
    fill_color = (255, 255, 255, 255)

    # Load fonts
    try:
        name_font = _load_font(font_path, tpl["name"]["size"])
        date_font = _load_font(font_path, tpl["date"]["size"])
    except Exception as e:
        print("[ERROR] Failed to load fonts:", e)
        raise

    # Resolve and (optionally) scale coordinates
    def place(field, text, font):
        fx, fy = tpl[field]["x"], tpl[field]["y"]
        anchor = tpl[field].get("anchor", "lt")
        sx, sy = _scale_xy(fx, fy, base_w, base_h, design_w, design_h)
        print(f"[DEBUG] Field '{field}' @ design({fx},{fy}) -> scaled({sx:.1f},{sy:.1f}), anchor={anchor}")
        _draw_text_with_anchor(draw, text, sx, sy, font, fill_color, anchor=anchor)

    # Name
    place("name", trader_name, name_font)
    # Date
    place("date", date_str, date_font)
    # Profit share / net profit text (optional)
    if profit_share_text and "profitshare" in tpl:
        ps_font = _load_font(font_path, tpl["profitshare"]["size"])
        place("profitshare", profit_share_text, ps_font)
        print(f"[DEBUG] Drew profit share text: {profit_share_text}")

    # QR Code (verification link)
    if certificate_id and "qr_code" in tpl:
        try:
            verification_url = f"https://dashboard.we-fund.com/verify/{certificate_id}"
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=0,
            )
            qr.add_data(verification_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="white", back_color="transparent").convert("RGBA")

            # Make black pixels transparent (keep white modules only)
            pixels = qr_img.load()
            for py in range(qr_img.height):
                for px in range(qr_img.width):
                    r, g, b, a = pixels[px, py]
                    if r < 128:  # dark pixel → transparent
                        pixels[px, py] = (0, 0, 0, 0)

            qr_cfg = tpl["qr_code"]
            qr_size = qr_cfg["size"]
            qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)

            qr_x, qr_y = _scale_xy(qr_cfg["x"], qr_cfg["y"], base_w, base_h, design_w, design_h)
            paste_x = int(qr_x - qr_size / 2)
            paste_y = int(qr_y - qr_size / 2)
            base.paste(qr_img, (paste_x, paste_y), qr_img)
            print(f"[DEBUG] QR code placed at ({paste_x},{paste_y}), size={qr_size}, url={verification_url}")
        except Exception as e:
            print(f"[WARN] QR code generation failed (continuing without): {e}")

    # Save PNG
    png_buffer = io.BytesIO()
    base.save(png_buffer, format="PNG")
    png_buffer.seek(0)

    unique_id = uuid.uuid4().hex[:8]
    filename_base = f"{bunnycdn_subfolder}/payout_{unique_id}"
    print(f"[DEBUG] Generated filename base: {filename_base}")

    print("[DEBUG] Uploading PNG to BunnyCDN...")
    image_url = upload_to_bunnycdn(png_buffer, f"{filename_base}.png")
    print(f"[DEBUG] Uploaded PNG URL: {image_url}")

    # Save PDF
    pdf_image = base.convert("RGB")
    pdf_buffer = io.BytesIO()
    # Use 300 DPI to match print designs (prevents “shift” when viewing/printing)
    pdf_image.save(pdf_buffer, format="PDF", resolution=300.0)
    pdf_buffer.seek(0)

    print("[DEBUG] Uploading PDF to BunnyCDN...")
    pdf_url = upload_to_bunnycdn(pdf_buffer, f"{filename_base}.pdf")
    print(f"[DEBUG] Uploaded PDF URL: {pdf_url}")

    return {"template": "payout", "image_url": image_url, "pdf_url": pdf_url}
