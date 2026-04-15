# api/swagger.py
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="We-Fund API",
        default_version='v1',
        description="Comprehensive API documentation for We-Fund platform",
        terms_of_service="https://we-fund.com/terms/",
        contact=openapi.Contact(email="support@we-fund.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)
