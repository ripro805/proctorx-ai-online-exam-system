from django.core.management.base import BaseCommand
from core.models import SystemSetting


class Command(BaseCommand):
    help = 'Seed system settings with defaults'

    def handle(self, *args, **options):
        obj, created = SystemSetting.objects.get_or_create(id=1)
        obj.institution_name = obj.institution_name or 'Demo University'
        obj.support_email = obj.support_email or 'support@demo.univ'
        obj.proctoring_policy = obj.proctoring_policy or {
            'require_id': True,
            'auto_flag_threshold': 3,
            'record_sessions': True,
        }
        obj.save()
        self.stdout.write(self.style.SUCCESS('Seeded system settings'))
