from wefund.models import SoftBreach

def handle_soft_breach(enrollment, account_id, breach_data, payout=None):
    """
    Create or update a SoftBreach entry linked to a specific payout.
    """
    SoftBreach.objects.update_or_create(
        user=enrollment.client.user,
        enrollment=enrollment,
        account_id=account_id,
        payout=payout,
        rule=breach_data["rule"],
        defaults={
            "value": breach_data.get("value"),
            "description": breach_data.get("description"),
            "resolved": False
        }
    )
