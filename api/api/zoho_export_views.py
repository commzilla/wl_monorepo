import datetime
from io import BytesIO
from django.http import HttpResponse
from rest_framework.views import APIView
from api.permissions import HasPermission
import openpyxl

from wefund.models import WebsiteOrder


# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────

AED_USD_RATE = 3.6725

EMIRATE_MAP = {
    "dubai": "DU",
    "abu dhabi": "AD",
    "sharjah": "SH",
    "ajman": "AJ",
    "umm al quwain": "UQ",
    "ras al khaimah": "RK",
    "fujairah": "FU",
}

COUNTRY_NAMES = {
    "AE": "United Arab Emirates",
    "US": "United States",
    "GB": "United Kingdom",
    "NL": "Netherlands",
    "DE": "Germany",
    "FR": "France",
    "IT": "Italy",
    "ES": "Spain",
    "CA": "Canada",
    "AU": "Australia",
    "IN": "India",
    "PK": "Pakistan",
    "BD": "Bangladesh",
    "NG": "Nigeria",
    "GH": "Ghana",
    "KE": "Kenya",
    "ZA": "South Africa",
    "EG": "Egypt",
    "SA": "Saudi Arabia",
    "QA": "Qatar",
    "KW": "Kuwait",
    "BH": "Bahrain",
    "OM": "Oman",
    "JO": "Jordan",
    "LB": "Lebanon",
    "TR": "Turkey",
    "BR": "Brazil",
    "MX": "Mexico",
    "CO": "Colombia",
    "AR": "Argentina",
    "CL": "Chile",
    "PE": "Peru",
    "MY": "Malaysia",
    "SG": "Singapore",
    "ID": "Indonesia",
    "TH": "Thailand",
    "PH": "Philippines",
    "VN": "Vietnam",
    "JP": "Japan",
    "KR": "South Korea",
    "CN": "China",
    "HK": "Hong Kong",
    "TW": "Taiwan",
    "RU": "Russia",
    "UA": "Ukraine",
    "PL": "Poland",
    "CZ": "Czech Republic",
    "RO": "Romania",
    "HU": "Hungary",
    "SE": "Sweden",
    "NO": "Norway",
    "DK": "Denmark",
    "FI": "Finland",
    "AT": "Austria",
    "CH": "Switzerland",
    "BE": "Belgium",
    "PT": "Portugal",
    "GR": "Greece",
    "IE": "Ireland",
    "NZ": "New Zealand",
    "IL": "Israel",
    "MA": "Morocco",
    "TN": "Tunisia",
    "DZ": "Algeria",
    "LK": "Sri Lanka",
    "NP": "Nepal",
    "MM": "Myanmar",
    "KH": "Cambodia",
    "LA": "Laos",
    "UZ": "Uzbekistan",
    "KZ": "Kazakhstan",
    "GE": "Georgia",
    "AM": "Armenia",
    "AZ": "Azerbaijan",
    "RS": "Serbia",
    "HR": "Croatia",
    "BA": "Bosnia and Herzegovina",
    "BG": "Bulgaria",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "LT": "Lithuania",
    "LV": "Latvia",
    "EE": "Estonia",
    "CY": "Cyprus",
    "MT": "Malta",
    "LU": "Luxembourg",
    "IS": "Iceland",
    "EC": "Ecuador",
    "VE": "Venezuela",
    "UY": "Uruguay",
    "PY": "Paraguay",
    "BO": "Bolivia",
    "CR": "Costa Rica",
    "PA": "Panama",
    "GT": "Guatemala",
    "DO": "Dominican Republic",
    "TT": "Trinidad and Tobago",
    "JM": "Jamaica",
    "TZ": "Tanzania",
    "UG": "Uganda",
    "ET": "Ethiopia",
    "CM": "Cameroon",
    "CI": "Ivory Coast",
    "SN": "Senegal",
    "MG": "Madagascar",
    "MZ": "Mozambique",
    "ZW": "Zimbabwe",
    "BW": "Botswana",
    "NA": "Namibia",
    "MU": "Mauritius",
    "RW": "Rwanda",
    "IQ": "Iraq",
    "AF": "Afghanistan",
    "YE": "Yemen",
    "SY": "Syria",
    "PS": "Palestine",
    "LY": "Libya",
    "SD": "Sudan",
    "AL": "Albania",
    "AD": "Andorra",
    "AO": "Angola",
    "AG": "Antigua and Barbuda",
    "BS": "Bahamas",
    "BB": "Barbados",
    "BY": "Belarus",
    "BZ": "Belize",
    "BJ": "Benin",
    "BT": "Bhutan",
    "BN": "Brunei",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "CV": "Cabo Verde",
    "CF": "Central African Republic",
    "TD": "Chad",
    "KM": "Comoros",
    "CG": "Congo",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "SZ": "Eswatini",
    "FJ": "Fiji",
    "GA": "Gabon",
    "GM": "Gambia",
    "GD": "Grenada",
    "GN": "Guinea",
    "GW": "Guinea-Bissau",
    "GY": "Guyana",
    "HT": "Haiti",
    "HN": "Honduras",
    "KI": "Kiribati",
    "KG": "Kyrgyzstan",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LI": "Liechtenstein",
    "MO": "Macao",
    "MW": "Malawi",
    "MV": "Maldives",
    "ML": "Mali",
    "MH": "Marshall Islands",
    "MR": "Mauritania",
    "FM": "Micronesia",
    "MD": "Moldova",
    "MC": "Monaco",
    "MN": "Mongolia",
    "ME": "Montenegro",
    "NR": "Nauru",
    "NE": "Niger",
    "NI": "Nicaragua",
    "MK": "North Macedonia",
    "PW": "Palau",
    "PG": "Papua New Guinea",
    "KN": "Saint Kitts and Nevis",
    "LC": "Saint Lucia",
    "VC": "Saint Vincent and the Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome and Principe",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "SS": "South Sudan",
    "SR": "Suriname",
    "TJ": "Tajikistan",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TO": "Tonga",
    "TM": "Turkmenistan",
    "TV": "Tuvalu",
    "VU": "Vanuatu",
    "VA": "Vatican City",
}


# ──────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────

def get_place_of_supply(order):
    if order.customer_country != "AE":
        return ""
    addr = order.customer_address or {}
    city = (addr.get("city") or "").strip().lower()
    state = (addr.get("state") or "").strip().lower()
    for name, code in EMIRATE_MAP.items():
        if name in city or name in state:
            return code
    return "REVIEW"


def get_vat_treatment(country_code):
    return "vat_not_registered" if country_code == "AE" else "non_gcc"


def get_item_tax(country_code):
    if country_code == "AE":
        return ("Standard Rate", 5)
    return ("Zero Rate", 0)


def assign_invoice_numbers(queryset, start_number):
    """Assign sequential invoice numbers to orders that don't have one yet."""
    orders_needing_numbers = queryset.filter(zoho_invoice_number__isnull=True).order_by("created_at")
    current = start_number
    for order in orders_needing_numbers:
        order.zoho_invoice_number = current
        order.save(update_fields=["zoho_invoice_number"])
        current += 1
    return queryset


def get_next_invoice_number():
    """Get the next available invoice number based on existing data."""
    last = WebsiteOrder.objects.filter(
        zoho_invoice_number__isnull=False
    ).order_by("-zoho_invoice_number").values_list("zoho_invoice_number", flat=True).first()
    return (last or 27000) + 1


def build_xlsx_response(rows, headers, filename):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    response = HttpResponse(
        buffer.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def get_base_queryset(date_from, date_to):
    qs = WebsiteOrder.objects.select_related("variant__product", "discount_code")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    return qs.order_by("created_at")


def parse_date_params(request):
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
    if date_from:
        date_from = datetime.datetime.strptime(date_from, "%Y-%m-%d").date()
    if date_to:
        date_to = datetime.datetime.strptime(date_to, "%Y-%m-%d").date()
    return date_from, date_to


def fmt_date(dt):
    if dt:
        return dt.strftime("%Y-%m-%d %H:%M")
    return ""


def get_addr_field(order, field):
    return (order.customer_address or {}).get(field, "")


def extract_payment_details(order):
    payload = order.webhook_payload or {}

    if order.payment_method == "card":
        card_brand = (
            payload.get("cardBrand")
            or payload.get("card", {}).get("brand")
            or payload.get("paymentMethod", "")
        )
        fee = float(payload.get("fee", 0) or payload.get("processingFee", 0) or 0)
        fee_vat = float(payload.get("feeVat", 0) or 0)
        payment_type = card_brand.upper() if card_brand else "CARD"

    elif order.payment_method == "crypto":
        crypto_type = (
            payload.get("cryptoCurrency")
            or payload.get("invoice", {}).get("cryptoCurrency")
            or payload.get("currency", "")
        )
        platform_fee = float(payload.get("fees", {}).get("platformFee", 0) or 0)
        network_fee = float(payload.get("fees", {}).get("networkFee", 0) or 0)
        fee = platform_fee + network_fee
        fee_vat = 0
        payment_type = crypto_type.upper() if crypto_type else "CRYPTO"

    else:
        fee = 0
        fee_vat = 0
        payment_type = order.payment_method.upper() if order.payment_method else "UNKNOWN"

    return payment_type, fee, fee_vat


# ──────────────────────────────────────────────
# Shared row builder for the 30 raw order columns
# ──────────────────────────────────────────────

ORDER_HEADERS = [
    "Order_id",
    "Order Date",
    "Order Link",
    "First Name (Billing)",
    "Last Name (Billing)",
    "Billing Address",
    "Billing City",
    "Billing State",
    "Billing Code",
    "Country Code",
    "Billing Country",
    "EmailID",
    "Phone",
    "PSP-transaction id",
    "Payment Mode",
    "Currency Code",
    "Completed Date",
    "Paid Date",
    "Discount Amount",
    "Invoice Total",
    "Quantity",
    "Order Total Fee",
    "Order Total Amount",
    "SKU",
    "Item Code",
    "Product Name (main)",
    "Item Price",
    "Coupon Code #1",
    "Discount Amount #1",
    "Source",
]


def get_order_source(order):
    """Determine source: CRM + payment provider, or mismatch."""
    provider_map = {
        "card": "Paytiko",
        "crypto": "Confirmo",
        "paypal": "PayPal",
    }
    provider = provider_map.get(order.payment_method, order.payment_method or "Unknown")
    has_payment_id = bool(order.payment_id)
    has_crm = True  # Always true since it's in the database

    if has_crm and has_payment_id:
        return f"CRM + {provider}"
    elif has_crm and not has_payment_id:
        return f"Mismatch: Present on CRM but missing on {provider}"
    return "Unknown"


def build_order_row(order):
    return [
        order.order_number,
        fmt_date(order.created_at),
        "https://crm.we-fund.com/website-orders",
        order.customer_first_name,
        order.customer_last_name,
        get_addr_field(order, "address_line_1"),
        get_addr_field(order, "city"),
        get_addr_field(order, "state"),
        get_addr_field(order, "postcode"),
        order.customer_country,
        COUNTRY_NAMES.get(order.customer_country, order.customer_country),
        order.customer_email,
        order.customer_phone,
        order.payment_id,
        order.payment_method,
        order.currency,
        fmt_date(order.updated_at) if order.status == "completed" else "",
        fmt_date(order.paid_at),
        float(order.discount_amount),
        float(order.total),
        1,
        float(order.addon_total),
        float(order.total),
        order.variant.sku if order.variant else "",
        order.variant.sku if order.variant else "",
        order.variant.product.name if order.variant and order.variant.product else "",
        float(order.variant.price) if order.variant else 0,
        order.discount_code.code if order.discount_code else "",
        float(order.discount_amount),
        get_order_source(order),
    ]


# ──────────────────────────────────────────────
# View 1: Orders Export
# ──────────────────────────────────────────────

class AccountingOrdersExportView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request):
        date_from, date_to = parse_date_params(request)
        qs = get_base_queryset(date_from, date_to)

        rows = [build_order_row(o) for o in qs]
        filename = f"export_orders_{date_from or 'all'}_to_{date_to or 'all'}.xlsx"
        return build_xlsx_response(rows, ORDER_HEADERS, filename)


# ──────────────────────────────────────────────
# View 2: Customers Export (deduplicated by email)
# ──────────────────────────────────────────────

CUSTOMER_HEADERS = [
    "Display Name",
    "First Name (Billing)",
    "Last Name (Billing)",
    "EmailID",
    "Phone",
    "Billing Address",
    "Billing City",
    "Billing State",
    "Billing Code",
    "Country Code",
    "Billing Country",
    "Currency Code",
    "Currency Rate",
    "Invoice Number",
    "vat treatment",
    "item tax",
    "Item Tax %",
    "Item Tax Type",
    "Is Discount Before Tax",
    "Discount Type",
    "Is Inclusive Tax",
    "place of supply",
]


class AccountingCustomersExportView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request):
        date_from, date_to = parse_date_params(request)
        start_num = int(request.GET.get("start_invoice_number", 0)) or get_next_invoice_number()

        qs = get_base_queryset(date_from, date_to)
        assign_invoice_numbers(qs, start_num)
        qs = get_base_queryset(date_from, date_to)  # refresh after assignment

        seen_emails = set()
        rows = []
        for o in qs:
            email_lower = o.customer_email.lower()
            if email_lower in seen_emails:
                continue
            seen_emails.add(email_lower)

            tax_name, tax_pct = get_item_tax(o.customer_country)
            rows.append([
                f"{o.customer_first_name} {o.customer_last_name}",
                o.customer_first_name,
                o.customer_last_name,
                o.customer_email,
                o.customer_phone,
                get_addr_field(o, "address_line_1"),
                get_addr_field(o, "city"),
                get_addr_field(o, "state"),
                get_addr_field(o, "postcode"),
                o.customer_country,
                COUNTRY_NAMES.get(o.customer_country, o.customer_country),
                o.currency,
                AED_USD_RATE,
                o.zoho_invoice_number or "",
                get_vat_treatment(o.customer_country),
                tax_name,
                tax_pct,
                "ItemAmount",
                "true",
                "item_level",
                "true",
                get_place_of_supply(o),
            ])

        filename = f"export_customers_{date_from or 'all'}_to_{date_to or 'all'}.xlsx"
        return build_xlsx_response(rows, CUSTOMER_HEADERS, filename)


# ──────────────────────────────────────────────
# View 3: Invoices Export
# ──────────────────────────────────────────────

INVOICE_COMPUTED_HEADERS = [
    "rate",
    "invoice nr.",
    "customer name",
    "Currency rate",
    "vat treatment",
    "item tax",
    "Item Tax %",
    "place of supply",
    "status",
]

INVOICE_HEADERS = INVOICE_COMPUTED_HEADERS + ORDER_HEADERS


class AccountingInvoicesExportView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request):
        date_from, date_to = parse_date_params(request)
        start_num = int(request.GET.get("start_invoice_number", 0)) or get_next_invoice_number()

        qs = get_base_queryset(date_from, date_to)
        assign_invoice_numbers(qs, start_num)
        qs = get_base_queryset(date_from, date_to)

        rows = []
        for o in qs:
            tax_name, tax_pct = get_item_tax(o.customer_country)
            computed = [
                float(o.variant.price) if o.variant else 0,
                o.zoho_invoice_number or "",
                f"{o.customer_first_name} {o.customer_last_name}",
                AED_USD_RATE,
                get_vat_treatment(o.customer_country),
                tax_name,
                tax_pct,
                get_place_of_supply(o),
                "",
            ]
            rows.append(computed + build_order_row(o))

        filename = f"export_invoices_{date_from or 'all'}_to_{date_to or 'all'}.xlsx"
        return build_xlsx_response(rows, INVOICE_HEADERS, filename)


# ──────────────────────────────────────────────
# View 4: Payments Export
# ──────────────────────────────────────────────

PAYMENT_HEADERS = [
    "Tax Name",
    "Mode",
    "reference_order",
    "Customer Name",
    "Invoice Payment Applied Date",
    "Deposit To",
    "amount paid",
    "Exchange Rate",
    "payment suffix",
    "bankcharge total",
    "Invoice Number",
    "Invoice Date",
    "Reference Number",
    "Customer Name",
    "customer_email",
    "Currency Code",
    "Payment Type",
    "Date",
    "Amount",
    "Bank Charges",
    "Bank Charges VAT",
    "Amount Applied to Invoice",
    "Payment Status",
    "comment",
]


class AccountingPaymentsExportView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request):
        date_from, date_to = parse_date_params(request)
        start_num = int(request.GET.get("start_invoice_number", 0)) or get_next_invoice_number()

        qs = get_base_queryset(date_from, date_to).filter(status__in=["paid", "completed"])
        assign_invoice_numbers(qs, start_num)
        qs = get_base_queryset(date_from, date_to).filter(status__in=["paid", "completed"])

        rows = []
        for o in qs:
            payment_type, fee, fee_vat = extract_payment_details(o)
            full_name = f"{o.customer_first_name} {o.customer_last_name}"
            total = float(o.total)
            bank_total = fee + fee_vat

            mode = "paytiko" if o.payment_method == "card" else (
                "confirmo" if o.payment_method == "crypto" else o.payment_method
            )

            comment = ""
            if not o.zoho_invoice_number:
                comment = "UNMATCHED - no invoice number"

            rows.append([
                "Exempt",
                mode,
                o.zoho_invoice_number or 0,
                full_name,
                fmt_date(o.paid_at),
                "WEFUND USD",
                total,
                AED_USD_RATE,
                o.zoho_invoice_number or mode,
                bank_total,
                o.zoho_invoice_number or "",
                fmt_date(o.created_at),
                o.payment_id,
                full_name,
                o.customer_email,
                "USD",
                payment_type,
                fmt_date(o.paid_at),
                total,
                fee,
                fee_vat,
                total - bank_total,
                "Captured",
                comment,
            ])

        filename = f"export_payments_{date_from or 'all'}_to_{date_to or 'all'}.xlsx"
        return build_xlsx_response(rows, PAYMENT_HEADERS, filename)
