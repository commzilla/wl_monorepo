from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from api.health_views import SystemHealthView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', SystemHealthView.as_view(), name='system-health-default'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
