import json
from collections import OrderedDict
from pathlib import Path

from django.apps import apps
from django.contrib.auth.models import Group, Permission
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction


class Command(BaseCommand):
    help = 'Import a local JSON backup into Neon PostgreSQL using bulk inserts.'

    def add_arguments(self, parser):
        parser.add_argument(
            'fixture_path',
            nargs='?',
            default='data.json',
            help='Path to the JSON backup file. Defaults to data.json in the project root.',
        )

    def handle(self, *args, **options):
        fixture_path = Path(options['fixture_path'])
        if not fixture_path.is_absolute():
            fixture_path = Path.cwd() / fixture_path

        if not fixture_path.exists():
            raise CommandError(f'Fixture not found: {fixture_path}')

        try:
            raw = fixture_path.read_text(encoding='utf-16')
        except UnicodeError:
            raw = fixture_path.read_text(encoding='utf-8-sig')

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise CommandError(f'Could not parse fixture JSON: {exc}') from exc

        groups_data = []
        users_data = []
        site_data = []
        system_setting_data = []
        model_rows = OrderedDict()

        skip_models = {
            'admin.logentry',
            'sessions.session',
        }

        for obj in payload:
            model_label = obj.get('model')
            if model_label == 'auth.group':
                groups_data.append(obj)
                continue
            if model_label == 'users.customuser':
                users_data.append(obj)
                continue
            if model_label == 'sites.site':
                site_data.append(obj)
                continue
            if model_label == 'core.systemsetting':
                system_setting_data.append(obj)
                continue
            if model_label in skip_models:
                continue
            model_rows.setdefault(model_label, []).append(obj)

        with transaction.atomic():
            self._upsert_site(site_data)
            self._upsert_system_setting(system_setting_data)
            self._upsert_groups(groups_data)
            self._bulk_insert_models(model_rows)
            self._assign_group_memberships(users_data)
            self._reset_sequences(model_rows, users_data, site_data, system_setting_data)

        self.stdout.write(self.style.SUCCESS('Backup import completed successfully.'))

    def _upsert_site(self, site_data):
        if not site_data:
            return
        site_obj = site_data[0]
        fields = site_obj.get('fields', {})
        Site.objects.update_or_create(
            pk=site_obj.get('pk', 1),
            defaults={
                'domain': fields.get('domain', 'example.com'),
                'name': fields.get('name', 'example.com'),
            },
        )

    def _upsert_system_setting(self, system_setting_data):
        if not system_setting_data:
            return

        from core.models import SystemSetting

        setting_obj = system_setting_data[0]
        fields = setting_obj.get('fields', {})
        SystemSetting.objects.update_or_create(
            pk=setting_obj.get('pk', 1),
            defaults={
                'institution_name': fields.get('institution_name', ''),
                'support_email': fields.get('support_email', ''),
                'proctoring_policy': fields.get('proctoring_policy', {}),
            },
        )

    def _upsert_groups(self, groups_data):
        for group_obj in groups_data:
            fields = group_obj.get('fields', {})
            group, _ = Group.objects.get_or_create(name=fields.get('name', ''))
            perm_natural_keys = fields.get('permissions', []) or []
            permissions = []
            for natural_key in perm_natural_keys:
                try:
                    permissions.append(Permission.objects.get_by_natural_key(*natural_key))
                except Permission.DoesNotExist:
                    continue
            if permissions:
                group.permissions.set(permissions)

    def _bulk_insert_models(self, model_rows):
        ordered_models = [
            'users.customuser',
            'core.systemsetting',
            'exams.exam',
            'exams.question',
            'exams.choice',
            'exams.examenrollment',
            'exams.examprogress',
            'exams.studentanswer',
            'results.result',
            'proctoring.studentexamsession',
            'proctoring.proctorlog',
            'ai_tutor.aiconversation',
            'ai_tutor.aimessage',
            'ai_tutor.aistudyplan',
            'ai_tutor.aiquiz',
            'token_blacklist.outstandingtoken',
            'token_blacklist.blacklistedtoken',
        ]

        for model_label in ordered_models:
            rows = model_rows.get(model_label, [])
            if not rows:
                continue
            model = apps.get_model(*model_label.split('.'))
            objects = []
            for row in rows:
                fields = row.get('fields', {})
                kwargs = {}
                for field_name, value in fields.items():
                    try:
                        field = model._meta.get_field(field_name)
                    except Exception:
                        continue
                    if field.many_to_many:
                        continue
                    if field.is_relation and (field.many_to_one or field.one_to_one):
                        kwargs[field.attname] = self._resolve_related_value(field, value)
                    else:
                        kwargs[field.name] = value
                objects.append(model(pk=row.get('pk'), **kwargs))
            model.objects.bulk_create(objects, batch_size=500)

    def _resolve_related_value(self, field, value):
        if isinstance(value, (list, tuple)):
            related_model = field.remote_field.model
            manager = related_model._default_manager
            if hasattr(manager, 'get_by_natural_key'):
                related_obj = manager.get_by_natural_key(*value)
                return related_obj.pk
            if len(value) == 1:
                lookup_field = getattr(related_model, 'USERNAME_FIELD', related_model._meta.pk.name)
                related_obj = manager.get(**{lookup_field: value[0]})
                return related_obj.pk
        return value

    def _assign_group_memberships(self, users_data):
        if not users_data:
            return

        User = apps.get_model('users', 'CustomUser')
        for row in users_data:
            fields = row.get('fields', {})
            user = User.objects.filter(pk=row.get('pk')).first()
            if not user:
                continue

            group_names = []
            for group_ref in fields.get('groups', []) or []:
                if isinstance(group_ref, (list, tuple)) and group_ref:
                    group_names.append(group_ref[0])

            if group_names:
                user.groups.set(Group.objects.filter(name__in=group_names))

    def _reset_sequences(self, model_rows, users_data, site_data, system_setting_data):
        sequence_models = [
            'users.customuser',
            'core.systemsetting',
            'exams.exam',
            'exams.question',
            'exams.choice',
            'exams.examenrollment',
            'exams.examprogress',
            'exams.studentanswer',
            'results.result',
            'proctoring.studentexamsession',
            'proctoring.proctorlog',
            'ai_tutor.aiconversation',
            'ai_tutor.aimessage',
            'ai_tutor.aistudyplan',
            'ai_tutor.aiquiz',
            'token_blacklist.outstandingtoken',
            'token_blacklist.blacklistedtoken',
        ]
        style = no_style()
        statements = []
        for label in sequence_models:
            model = apps.get_model(*label.split('.'))
            statements.extend(connection.ops.sequence_reset_sql(style, [model]))

        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
