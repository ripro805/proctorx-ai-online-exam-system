from django.conf import settings
import os
import django
import sys
from pathlib import Path

# Ensure project root is on PYTHONPATH so Django settings can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proctor_ai.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_teacher(email='teacher_new@demo.com', username='teacher_new', full_name='Teacher New', password='teacher1234'):
    user = User.objects.filter(email=email).first() or User.objects.filter(username=username).first()
    if not user:
        user = User.objects.create_user(email=email, username=username, role='teacher', full_name=full_name, password=password)
        user.is_staff = True
        user.save()
        print(f'Created teacher: {email} (password: {password})')
    else:
        print(f'Teacher already exists: {user.email} (username: {user.username})')

if __name__ == '__main__':
    create_teacher()
