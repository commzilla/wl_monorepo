import tempfile
from weasyprint import HTML
from django.template.loader import render_to_string
from django.conf import settings


def render_report_pdf(*, template_name, context):
    html_string = render_to_string(template_name, context)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        HTML(
            string=html_string,
            base_url=settings.STATIC_ROOT or settings.BASE_DIR,
        ).write_pdf(tmp.name)

        return tmp.name
