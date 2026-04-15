from django.db import migrations


def add_rise_invite_permission(apps, schema_editor):
    Permission = apps.get_model("wefund", "Permission")
    Role = apps.get_model("wefund", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="kyc.send_rise_invite",
        defaults={
            "name": "Send Rise Invite",
            "category": "kyc",
            "description": "Manually send or resend Rise KYC invites to traders",
        },
    )

    # Add to Support role
    try:
        support = Role.objects.get(slug="support")
        support.permissions.add(perm)
    except Role.DoesNotExist:
        pass

    # Admin already has __all__ but ensure it's explicitly there too
    try:
        admin = Role.objects.get(slug="admin")
        admin.permissions.add(perm)
    except Role.DoesNotExist:
        pass


def remove_rise_invite_permission(apps, schema_editor):
    Permission = apps.get_model("wefund", "Permission")
    Permission.objects.filter(codename="kyc.send_rise_invite").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("wefund", "0203_shift_order_numbers_to_40000"),
    ]

    operations = [
        migrations.RunPython(add_rise_invite_permission, remove_rise_invite_permission),
    ]
