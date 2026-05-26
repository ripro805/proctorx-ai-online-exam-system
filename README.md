# ProctorX AI Pro

## Overview
Full-stack AI proctoring platform with Django/DRF backend and Vite frontend.

## Setup
1. Create `.env` from `.env.example` and update values.
2. Create a virtualenv and install backend deps:
   - `pip install -r requirements.txt` (if you maintain requirements)
3. Run migrations:
   - `python manage.py migrate`
4. Seed demo data (optional):
   - `python manage.py seed_demo`
   - `python manage.py seed_system`
5. Start Django:
   - `python manage.py runserver`
6. Start frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Demo Accounts
- Admin: `admin@demo.com` / `demo1234`
- Teacher: `teacher@demo.com` / `demo1234`
- Students: `student1@demo.com` … `student6@demo.com` / `demo1234`

## Docs
- API reference: `docs/api.md`
