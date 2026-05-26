# ProctorX API Reference

Base URL: `http://localhost:8000/api`

## Auth
- `POST /auth/register/` — `{ name, email, password }`
- `POST /auth/login/` — `{ email, password }` → `{ access, refresh, role, email, user_id, name }`
- `POST /auth/token/refresh/` — `{ refresh }`
- `POST /auth/logout/` — `{ refresh }`
- `GET/PATCH /auth/profile/`
- `PATCH /auth/users/:id/role/` (admin)

## Student
- `GET /dashboard/student/`
- `GET /student/exams/`
- `GET /student/results/overview/`
- `GET /notifications/`
- `POST /exam/start/` — `{ exam_id }`
- `POST /exam/submit/` — `{ exam_id, answers: [{question_id, choice_id}] }`
- `POST /exam/save/` — `{ exam_id, answers: [...] }`
- `GET /exam/progress/?exam_id=`

## Teacher
- `GET /teacher/summary/`
- `GET /teacher/analytics/`
- `GET /teacher/exams/`
- `GET /teacher/students/`
- `GET /teacher/results/`
- `GET /teacher/reports/`

## Admin
- `GET /admin/summary/`
- `GET /admin/analytics/`
- `GET /admin/users/`
- `GET /admin/teachers/`
- `GET /admin/security-alerts/`
- `GET /admin/proctoring/`
- `GET /admin/reports/`
- `GET/PUT /admin/settings/`

## Exams
- `GET /exams/` (admin/teacher)
- `GET /exams/:id/`
- `POST /exams/`
- `PATCH /exams/:id/`
- `DELETE /exams/:id/`
- `GET /questions/` (teacher)

## Proctoring
- `POST /proctoring/log/` — `{ exam, event_type, message? }`
- `POST /proctoring/frame/` — `{ exam, frame }`
- `GET /proctoring/my-logs/`
- `GET /proctoring/logs/`
- `GET /proctoring/teacher/active-students/`

## WebSocket
- `ws://localhost:8000/ws/proctoring/` — Global proctoring feed
- `ws://localhost:8000/ws/exam/:exam_id/` — Exam-specific feed
