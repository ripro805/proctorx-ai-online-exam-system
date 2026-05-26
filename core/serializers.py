from rest_framework import serializers

from core.models import SystemSetting


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ("id", "institution_name", "support_email", "proctoring_policy", "updated_at")
