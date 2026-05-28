# ProctorX AI — Online Exam & Proctoring System

A full-stack online exam and proctoring platform (Django backend + Vite + React frontend) with AI-assisted proctoring and grading.

This repository contains a monorepo with a Django API, a modern React/TanStack Start frontend, and server-side rendering served via Vercel Serverless functions.

---

## Quick summary
- Backend: Django (Python) — API, models, authentication, exam workflows
- Frontend: Vite + React + TanStack Start (SSR + client) in `frontend/`
- Deployment: Vercel for frontend SSR + static assets; backend runs separately (or via API endpoints)

## Features
- Create/manage exams, questions, and enrollments
- AI-powered proctoring (voice/video hooks, result recording)
- AI tutoring and grading microservices under `ai_tutor/services/`
- SSR rendering with Vite/TanStack Start for SEO and fast cold-load

## Project layout (top-level)
- `frontend/` — Vite React client + SSR server entry
- `api/`, `proctor_ai/`, `ai_tutor/`, `proctoring/`, `users/`, `exams/` — Django apps
- `vercel.json` — Vercel deployment configuration (repo root)

## Architecture & design notes

- Frontend build produces `frontend/dist/client` (static assets) and `frontend/dist/server` (SSR entry). The SSR function imports the built server entry and translates Node IncomingMessage → Fetch Request → Response.
- To handle ESM/CJS differences on Vercel we use a small CommonJS bridge at `api/index.js` which dynamically imports the ESM handler built from the frontend and forwards requests.
- Static assets are either served directly from the Vite client output root or (when necessary) via a static-file fallback implemented in the SSR function. See `vercel.json` for routes.

## Local development

Prerequisites: Node 18+, npm, Python 3.10+, virtualenv (recommended).

Backend (Django)

1. Create and activate a virtualenv

```bash
python -m venv .proctorai_env
source .proctorai_env/bin/activate   # macOS/Linux
\.proctorai_env\Scripts\activate   # Windows PowerShell
```

2. Install Python deps and setup DB

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata exams/fixtures/exams.json  # optional
```

3. Run backend

```bash
python manage.py runserver
```

Frontend (client + SSR)

1. Install and build

```bash
cd frontend
npm ci
npm run build
```

2. Local preview (client only)

```bash
npx serve frontend/dist/client
# or for SSR locally follow TanStack Start docs to run the server entry
```

## Environment variables (important)
- VITE_API_BASE_URL — API base URL used by frontend
- VITE_WS_BASE_URL — WebSocket base URL
- DJANGO_SECRET_KEY — Django secret
- DATABASE_URL — Postgres/SQLite connection string for production if used
- Any AI keys (OPENAI_API_KEY / GEMINI_KEY) used by `ai_tutor/services`

Note: put secrets in Vercel Environment Variables (Project Settings) for production.

## Vercel deployment notes

- Project uses a repo-root `vercel.json` that runs the build inside `frontend/`:

```json
{
  "installCommand": "cd frontend && npm ci",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist/client",
  "functions": { "api/index.js": { "maxDuration": 30 } }
}
```

- The SSR function and static assets are configured so CSS/JS requests are resolved correctly. If you see 404s for `/assets/...` ensure the build step produced `frontend/dist/client/assets` and that Vercel used the latest commit.

## Troubleshooting (common issues)
- ERR_REQUIRE_ESM when Vercel `api/index` tries to `require()` an ESM file
  - Fixed by using a CommonJS bridge `api/index.js` that dynamically imports the ESM module.
- Missing CSS/JS (404)
  - Confirm `frontend/dist/client/assets` exists locally after build.
  - Ensure `vercel.json` outputDirectory points to `frontend/dist/client` or copy assets to repo-root `public/assets` in postbuild.
- __dirname ReferenceError on Vercel (ESM)
  - Use `import.meta.url` and `fileURLToPath` to compute __dirname-equivalent values.

## Contributing
- Fork, open a branch, run tests and send a PR. Please follow existing code style and add tests for backend logic.

## License
This project is released under the MIT License — see `LICENSE`.

---

If you want this README translated to Bengali or expanded with diagrams and a deployment checklist (Vercel dashboard screenshots, env var list), tell me which sections to expand and I'll update it.# ProctorX AI Pro

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
- Deployment guide: `docs/deployment-render-vercel.md`
- Render blueprint: `render.yaml`
- Vercel config: `frontend/vercel.json`
- Local env template: `.env.example`
