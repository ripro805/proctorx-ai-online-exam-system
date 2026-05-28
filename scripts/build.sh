#!/usr/bin/env bash
set -o errexit

echo "[build] install Python dependencies"
pip install -r requirements.txt

echo "[build] run migrations"
python manage.py migrate

echo "[build] collect static files"
python manage.py collectstatic --no-input --clear

echo "[build] bootstrap data (merge users/groups and seed if empty)"
python manage.py bootstrap_data

echo "[build] done"