# Render + Vercel deployment guide

This project is split into two parts:

- **Backend**: Django + DRF + Channels on **Render**
- **Frontend**: Vite app on **Vercel**

> Note: the repository currently uses a `.env` file for local development. A safe starter template is provided in `.env.example`.

## 1) Backend on Render

### Create the services
1. Push the repository to GitHub.
2. In Render, create a **Web Service** from the GitHub repo.
3. Create a **PostgreSQL** database in Render.
4. (Optional but recommended for realtime/WebSocket features) create a **Redis** instance.

### Use these backend settings on Render
Set the following environment variables in the Render web service:

```env
DJANGO_SECRET_KEY=replace-me-with-a-long-random-secret
DJANGO_DEBUG=False
DJANGO_ENV=production
DJANGO_ALLOWED_HOSTS=proctorx-ai-api.onrender.com
DATABASE_URL=<paste-the-render-postgres-url-here>
DB_CONN_MAX_AGE=600
USE_NEON_DATABASE=False
CORS_ALLOWED_ORIGINS=https://proctorx-ai-web.vercel.app
CSRF_TRUSTED_ORIGINS=https://proctorx-ai-web.vercel.app
DJANGO_SITE_ID=1
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_USE_TLS=True
EMAIL_PORT=587
EMAIL_HOST_USER=<your-email>
EMAIL_HOST_PASSWORD=<your-email-app-password>
GEMINI_API_KEY=<your-gemini-key>
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=<your-groq-key>
GROQ_MODEL=llama-3.1-70b-versatile
REDIS_URL=<your-redis-url>
FRONTEND_URL=https://proctorx-ai-web.vercel.app
AI_DEFAULT_PROVIDER=gemini
AI_DEFAULT_MODEL=gemini-1.5-flash
AI_FALLBACK_MODEL=gpt-4o-mini
```

### Build and start commands
Use these commands in Render:

- **Build command**: install Python dependencies, collect static files, and apply migrations.
- **Start command**: `daphne -b 0.0.0.0 -p $PORT proctor_ai.asgi:application`

If your repo does not yet have a `requirements.txt`, create one before deployment and point Render to it.

### Recommended Render settings (copy-paste)
In the Render Web Service settings set:

- **Build Command** (paste):

```bash
pip install -r requirements.txt && bash ./scripts/init_db.sh
```

- **Start Command** (paste):

```bash
daphne -b 0.0.0.0 -p $PORT proctor_ai.asgi:application
```

The `init_db.sh` script will:

- install dependencies (if `requirements.txt` exists)
- run `python manage.py migrate --noinput`
- run `python manage.py collectstatic --noinput --clear`
- load any JSON fixtures found in `*/fixtures/*.json`
- create a superuser if `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, and `DJANGO_SUPERUSER_PASSWORD` are set in the Render environment

Add these environment variables in Render so the script can create the admin and connect to Neon:

```env
DATABASE_URL=<render-postgres-or-neon-connection-string>
DJANGO_SECRET_KEY=<secure-secret>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=proctorx-ai-api.onrender.com
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=strongpassword123
```

Important: keep `DATABASE_URL` secret and do not commit it to the repo. After first deploy, verify the admin user exists and rotate any leaked credentials.

### Database and static files
1. Point `DATABASE_URL` to the Render PostgreSQL connection string.
2. Run migrations after the first deploy.
3. Make sure static files are collected during build.
4. If you use Redis for Channels, keep `REDIS_URL` set; otherwise the app falls back to in-memory channels for local use.

### After deployment
1. Open the Render backend URL.
2. Verify `/admin/` loads.
3. Verify `/api/` endpoints respond.
4. Create a superuser if needed.

## 2) Frontend on Vercel

### Create the project
1. Import the same GitHub repo into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Build the project with Vite.

### Frontend environment variables on Vercel
Add these variables in the Vercel project settings:

```env
VITE_API_BASE_URL=https://proctorx-ai-api.onrender.com/api
VITE_WS_BASE_URL=wss://proctorx-ai-api.onrender.com
```

### Frontend build settings
- **Build command**: `npm run build`
- **Output directory**: `dist`

### SPA routing
If you are serving the app as a single-page app, keep the Vercel rewrite so client-side routes work correctly.

## 3) Local development

### Backend
1. Create/activate your Python virtual environment.
2. Copy `.env.example` to `.env`.
3. Fill in the local values.
4. Run migrations.
5. Start Django / ASGI.

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env.local`.
2. Update the API and WebSocket URLs if your backend runs elsewhere.
3. Start the Vite dev server.

## 4) Copy-paste env templates

### Root `.env`
Use this when you want a single local template for the project root:

```env
DJANGO_SECRET_KEY=replace-me-with-a-long-random-secret
DJANGO_DEBUG=True
DJANGO_ENV=development
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=
POSTGRES_DB=proctorx_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace-me
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DB_CONN_MAX_AGE=600
USE_NEON_DATABASE=False
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8081
DJANGO_SITE_ID=1
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_USE_TLS=True
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=replace-with-app-password
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-70b-versatile
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000
AI_DEFAULT_PROVIDER=gemini
AI_DEFAULT_MODEL=gemini-1.5-flash
AI_FALLBACK_MODEL=gpt-4o-mini
```

### `frontend/.env.local`
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000
```

## 5) Important notes
- Do **not** commit real secrets to GitHub.
- If the credentials currently in your local `.env` are real, rotate them after deployment.
- The backend uses JWT auth, CORS, and WebSockets, so the API and frontend domains must match the deployed URLs.
