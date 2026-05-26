from django.contrib import admin
from core.models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ("institution_name", "support_email", "updated_at")
