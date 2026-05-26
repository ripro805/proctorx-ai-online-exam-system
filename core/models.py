from django.db import models


class SystemSetting(models.Model):
    institution_name = models.CharField(max_length=255, default="")
    support_email = models.EmailField(blank=True, default="")
    proctoring_policy = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return "System Settings"
