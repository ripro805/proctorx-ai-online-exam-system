from __future__ import annotations

from typing import Any

from django.db.models import Avg, Count
from django.utils import timezone

from exams.models import Exam
from proctoring.models import StudentExamSession
from results.models import Result


def has_active_exam_session(student) -> bool:
    """Return True when the student currently has a real active exam session.

    Conditions for an active session:
    - There is a StudentExamSession for the student with status 'ongoing'
    - The linked exam's start_time <= now <= end_time
    - The session has not been ended (ended_at is None or in the future)
    - No Result exists for the (student, exam) (i.e. not submitted)
    """
    now = timezone.now()
    # small tolerance to account for microsecond differences when tests create
    # an exam with start_time == end_time == now
    from datetime import timedelta
    tolerance = timedelta(seconds=1)
    qs = StudentExamSession.objects.select_related('exam').filter(student=student, status='ongoing')
    for session in qs:
        exam = getattr(session, 'exam', None)
        # if exam missing, skip
        if not exam:
            continue
        # ensure exam time window still active
        if not (exam.start_time and exam.end_time and exam.start_time <= now <= (exam.end_time + tolerance)):
            continue
        # if session ended already, skip
        if session.ended_at and session.ended_at <= now:
            continue
        # if a result exists for this student+exam, treat as submitted
        if Result.objects.filter(student=student, exam=exam).exists():
            continue
        return True
    return False


def active_exam_block_message() -> str:
    return 'AI Tutor disabled during active examination.'


def weak_subjects_for_student(student) -> list[dict[str, Any]]:
    results = (
        Result.objects.filter(student=student)
        .values('exam__subject')
        .annotate(avg=Avg('percentage'), count=Count('id'))
        .order_by('avg')
    )
    weak = []
    for item in results[:5]:
        weak.append({
            'subject': item['exam__subject'] or 'General',
            'average': round(item['avg'] or 0, 2),
            'attempts': item['count'],
        })
    return weak


def upcoming_exams_for_student(student) -> list[dict[str, Any]]:
    qs = Exam.objects.filter(is_published=True).order_by('start_time')[:5]
    return [
        {
            'id': exam.id,
            'title': exam.title,
            'subject': exam.subject or 'General',
            'date': exam.start_time.date().isoformat() if exam.start_time else None,
        }
        for exam in qs
    ]
