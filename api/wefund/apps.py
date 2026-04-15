from django.apps import AppConfig

class WefundConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'wefund'
    
    def ready(self):
        import wefund.signals  # This ensures signal handlers are registered
        # import wefund.active_log_signals  # Disabled temporarily
