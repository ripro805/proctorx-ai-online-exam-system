from django.core.management.base import BaseCommand
from django.core.management import call_command
import runpy
import os


class Command(BaseCommand):
    help = 'Bootstrap initial data: merge users/groups and seed exams if DB empty'

    def handle(self, *args, **options):
        from django.apps import apps
        Exam = apps.get_model('exams', 'Exam')
        try:
            exists = Exam.objects.exists()
        except Exception:
            exists = False

        self.stdout.write('Exam objects exist: %s' % exists)

        # always ensure migrations run (build script runs migrate too, but safe)
        try:
            call_command('migrate', interactive=False)
        except Exception as e:
            self.stderr.write('migrate error: %s' % e)

        # merge users/groups from fixture if present
        fixture_path = os.path.join(os.getcwd(), 'data.cleaned.json')
        if os.path.exists(fixture_path):
            try:
                call_command('merge_fixtures', '--fixture', fixture_path)
            except Exception as e:
                self.stderr.write('merge_fixtures error: %s' % e)

        if not exists:
            self.stdout.write('Seeding minimal data from fixture...')
            script_path = os.path.join(os.getcwd(), 'scripts', 'quick_seed_minimal.py')
            if os.path.exists(script_path):
                try:
                    runpy.run_path(script_path, run_name='__main__')
                except Exception as e:
                    self.stderr.write('seed script error: %s' % e)
            else:
                self.stdout.write('No quick seed script found; skipping')
        else:
            self.stdout.write('DB already has exam data; skipping seed')
