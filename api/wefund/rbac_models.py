import uuid
from django.db import models


class Permission(models.Model):
    """
    Granular permission for RBAC.
    Seeded via data migration — never user-created.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codename = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["category", "codename"]

    def __str__(self):
        return f"{self.codename} ({self.name})"


class Role(models.Model):
    """
    Custom role with a set of permissions.
    System roles (is_system=True) cannot be deleted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def has_permission(self, codename):
        return self.permissions.filter(codename=codename).exists()

    def has_any_permission(self, codenames):
        return self.permissions.filter(codename__in=codenames).exists()
