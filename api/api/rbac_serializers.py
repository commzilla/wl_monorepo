from rest_framework import serializers
from wefund.rbac_models import Permission, Role


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "codename", "name", "category", "description"]
        read_only_fields = fields


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SlugRelatedField(
        many=True,
        slug_field="codename",
        queryset=Permission.objects.all(),
    )
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id", "name", "slug", "description", "is_system",
            "permissions", "user_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_system", "user_count", "created_at", "updated_at"]

    def get_user_count(self, obj):
        return obj.users.count()

    def validate_slug(self, value):
        instance = self.instance
        qs = Role.objects.filter(slug=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this slug already exists.")
        return value

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.is_system:
            # System roles: only permissions can be edited
            if "name" in attrs and attrs["name"] != instance.name:
                raise serializers.ValidationError({"name": "Cannot change name of a system role."})
            if "slug" in attrs and attrs["slug"] != instance.slug:
                raise serializers.ValidationError({"slug": "Cannot change slug of a system role."})
        return attrs


class RoleReadSerializer(serializers.ModelSerializer):
    """Lightweight read-only serializer for embedding in user responses."""
    class Meta:
        model = Role
        fields = ["id", "name", "slug"]
        read_only_fields = fields
