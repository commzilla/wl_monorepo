from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, ClientProfile, Order


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ('username', 'email', 'role', 'status', 'two_factor_enabled', 'is_staff')
    list_filter = ('role', 'status', 'two_factor_enabled', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'phone')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
        (_('Custom info'), {'fields': ('role', 'status', 'two_factor_enabled')}),
    )


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'kyc_status', 'has_live_account', 'referred_by')
    list_filter = ('kyc_status', 'has_live_account')
    search_fields = ('user__username', 'user__email', 'referred_by__username')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'customer_name', 'status', 'payment_status',
        'total_usd', 'paid_usd', 'payment_method', 'date_created'
    )
    list_filter = ('status', 'payment_status', 'payment_method')
    search_fields = ('customer_name', 'customer_email', 'user__username')
    readonly_fields = ('raw_data',)


# Register the customized User admin
admin.site.register(User, UserAdmin)
