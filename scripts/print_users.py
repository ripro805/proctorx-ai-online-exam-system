import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
User=get_user_model()
for u in User.objects.all():
    print(u.pk, u.email)
