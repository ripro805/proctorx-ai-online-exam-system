"""Verify the 5 student-section exams are visible via the API.

Authenticates as `student@demo.com` and hits `/api/exams/`, then derives
status from `start_time`/`end_time` for the new exam titles.

Run from the project root:
    .\\.proctorai_env\\Scripts\\python.exe scripts\\verify_student_exams.py
"""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proctor_ai.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

User = get_user_model()

NEW_TITLES = {
    "Data Structures & Algorithms - Midterm Examination",
    "Linear Algebra - Quiz 3: Eigenvalues & Vector Spaces",
    "Organic Chemistry - Lab Quiz: Reaction Mechanisms",
    "Microeconomics - Final Examination",
    "English Literature - Victorian Era: Authors, Themes, and Texts",
}


def derive_status(exam, now):
    if exam.start_time <= now <= exam.end_time:
        return "Ongoing"
    if exam.start_time > now:
        return "Scheduled for Tomorrow"
    return "Completed"


def main():
    student = User.objects.filter(email="student@demo.com", role="student").first()
    if student is None:
        print("student@demo.com not found")
        sys.exit(1)

    client = APIClient()
    client.force_authenticate(user=student)

    # Per-id fetches are much faster than rendering the full list (~1300+ questions).
    from exams.models import Exam  # local import after django.setup()

    now = timezone.now()
    found = 0
    for exam in Exam.objects.filter(title__in=NEW_TITLES).order_by("id"):
        resp = client.get(f"/api/exams/{exam.id}/")
        if resp.status_code == 200:
            status = derive_status(exam, now)
            data = resp.json()
            qcount = len(data.get("questions", []))
            print(
                f"[{status:>22}] id={exam.id:>2}  "
                f"Qs={qcount}  marks={data.get('total_marks', exam.total_marks)}  "
                f"{exam.title}"
            )
            found += 1
        else:
            print(f"  ! id={exam.id} HTTP {resp.status_code} - {exam.title}")

    print()
    print(f"Found {found}/5 expected exams via API.")


if __name__ == "__main__":
    main()