from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from pathlib import Path
import json


class Command(BaseCommand):
    help = "Safely merge JSON fixture users/groups into the database without deleting existing data."

    def add_arguments(self, parser):
        parser.add_argument(
            '--fixture', '-f', dest='fixture', default=str(Path('data.cleaned.json')),
            help='Path to fixture JSON file (default: data.cleaned.json)'
        )
        parser.add_argument('--dry-run', action='store_true', dest='dry_run', help='Show changes but do not save')

    def handle(self, *args, **options):
        fixture_path = Path(options['fixture'])
        dry_run = options['dry_run']

        if not fixture_path.exists():
            raise CommandError(f'Fixture file not found: {fixture_path}')

        User = get_user_model()

        with fixture_path.open('r', encoding='utf-8') as fh:
            data = json.load(fh)

        users_processed = 0
        groups_processed = 0

        for obj in data:
            model = obj.get('model', '').lower()
            fields = obj.get('fields', {})

            if model.endswith('users.customuser') or model.endswith('users.customuser'):
                email = fields.get('email')
                if not email:
                    self.stdout.write(self.style.WARNING('Skipping user fixture without email'))
                    continue
                user, created = User.objects.get_or_create(email=email)
                changed = []
                # Map known user fields safely
                mapping = {
                    'username': 'username',
                    'full_name': 'full_name',
                    'phone_number': 'phone_number',
                    'institution': 'institution',
                    'student_id': 'student_id',
                    'role': 'role',
                    'is_active': 'is_active',
                    'is_staff': 'is_staff',
                    'is_superuser': 'is_superuser',
                }
                for src, dest in mapping.items():
                    if src in fields:
                        val = fields.get(src)
                        if getattr(user, dest, None) != val:
                            setattr(user, dest, val)
                            changed.append(dest)

                # Preferences JSON field
                if 'preferences' in fields:
                    prefs = fields.get('preferences')
                    if prefs is not None and getattr(user, 'preferences', None) != prefs:
                        user.preferences = prefs
                        changed.append('preferences')

                # Password handling: if looks like Django hashed password (contains '$'), assign directly, else use set_password
                pwd = fields.get('password')
                if pwd:
                    if isinstance(pwd, str) and ('$' in pwd or pwd.startswith('pbkdf2_')):
                        # assign raw hashed password
                        user.password = pwd
                        changed.append('password(hashed)')
                    else:
                        user.set_password(pwd)
                        changed.append('password')

                users_processed += 1
                if dry_run:
                    self.stdout.write(f"[dry-run] user {email} {'(new)' if created else '(exists)'} -> changed: {changed}")
                else:
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f"user {email} {'created' if created else 'updated'} -> {changed}"))

            elif model.endswith('auth.group') or model.endswith('group'):
                name = fields.get('name')
                if not name:
                    self.stdout.write(self.style.WARNING('Skipping group entry without name'))
                    continue
                group, created = Group.objects.get_or_create(name=name)
                # Process permissions if present
                perms = fields.get('permissions') or []
                added = []
                for perm_triplet in perms:
                    # Expecting [codename, app_label, model]
                    try:
                        codename, app_label, model_name = perm_triplet
                    except Exception:
                        continue
                    try:
                        ct = ContentType.objects.filter(app_label=app_label, model=model_name).first()
                        if not ct:
                            continue
                        perm = Permission.objects.filter(content_type=ct, codename=codename).first()
                        if perm and perm not in group.permissions.all():
                            if not dry_run:
                                group.permissions.add(perm)
                            added.append(f"{app_label}.{codename}")
                    except Exception:
                        continue
                groups_processed += 1
                if dry_run:
                    self.stdout.write(f"[dry-run] group {name} {'(new)' if created else '(exists)'} -> perms to add: {added}")
                else:
                    group.save()
                    self.stdout.write(self.style.SUCCESS(f"group {name} {'created' if created else 'updated'} -> perms added: {added}"))

        self.stdout.write(self.style.NOTICE(f"Processed {users_processed} user entries and {groups_processed} group entries"))
