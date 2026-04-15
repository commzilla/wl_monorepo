class Mt5GatewayRouter:
    """
    Prevents Django from running migrations on the external MT5 Gateway database.
    The 'mt5_gateway' database is a read-only PostgreSQL connection used only
    for raw SQL queries — no Django models live there.
    """

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'mt5_gateway':
            return False
        return None
