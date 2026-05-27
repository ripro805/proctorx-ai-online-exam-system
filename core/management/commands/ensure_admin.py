from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Ensure an admin user exists with given email and password; make staff & superuser.'

    def add_arguments(self, parser):
        parser.add_argument('--email', dest='email', required=True, help='Admin email')
        parser.add_argument('--password', dest='password', required=True, help='Admin password')

    def handle(self, *args, **options):
        User = get_user_model()
        email = options['email']
        password = options['password']
        user = User.objects.filter(email=email).first()
        if not user:
            self.stdout.write(f'Admin user not found for {email}; creating...')
            user = User.objects.create_user(email=email, password=password, username=email.split('@')[0], role='admin', full_name='Admin User')
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user {email}'))
            return
        # update existing
        changed = False
        if not user.is_staff:
            user.is_staff = True
            changed = True
        if not user.is_superuser:
            user.is_superuser = True
            changed = True
        # set password
        user.set_password(password)
        changed = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Updated admin user {email} (password set, staff/superuser flags ensured)'))
