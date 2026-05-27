#!/usr/bin/env bash
set -euo pipefail

echo "[init_db] activating virtual environment if present"
if [ -f ".venv/bin/activate" ]; then
  # local pattern
  source .venv/bin/activate
fi

echo "[init_db] installing python requirements if requirements.txt present"
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

echo "[init_db] running migrations"
python manage.py migrate --noinput

echo "[init_db] collecting static files"
python manage.py collectstatic --noinput --clear

echo "[init_db] loading fixtures (if any)"
# load any JSON fixtures in app fixtures/ directories
shopt -s nullglob
for f in */fixtures/*.json; do
  echo "[init_db] loading $f"
  python manage.py loaddata "$f" || true
done
shopt -u nullglob

if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  echo "[init_db] creating superuser ${DJANGO_SUPERUSER_USERNAME} (if not exists)"
  python - <<PY
import os
import django
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print('Superuser created:', username)
else:
    print('Superuser already exists:', username)
PY
else
  echo "[init_db] DJANGO_SUPERUSER_* env vars not set; skipping superuser creation"
fi

echo "[init_db] finished"
