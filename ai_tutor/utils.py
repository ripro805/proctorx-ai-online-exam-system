from __future__ import annotations

from typing import Any

from django.db.models import Avg, Count

from exams.models import Exam
from proctoring.models import StudentExamSession
from results.models import Result


def has_active_exam_session(student) -> bool:
    return bool(StudentExamSession.objects.filter(student=student, status='ongoing').exists())


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
