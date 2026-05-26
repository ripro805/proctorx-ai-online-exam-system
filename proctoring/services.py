"""Reusable proctoring services: centralized event logging and helpers."""
from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Optional

from django.core.files.base import ContentFile
from django.utils import timezone

from proctoring.models import ProctorLog, StudentExamSession

logger = logging.getLogger(__name__)


EVENT_TYPE_MAP = {
    'NO_FACE_DETECTED': 'no_face',
    'MULTIPLE_FACES_DETECTED': 'multiple_faces',
    'FACE_OK': 'face_not_centered',
    'TAB_SWITCH': 'tab_switch',
    'FULLSCREEN_EXIT': 'fullscreen_exit',
    'COPY_BLOCKED': 'copy_attempt',
    'PASTE_BLOCKED': 'paste_attempt',
    'RIGHT_CLICK_BLOCKED': 'right_click',
    'EXAM_STARTED': 'exam_started',
    'EXAM_SUBMITTED': 'exam_submitted',
}


def _normalize_event_type(event_type: str) -> str:
    if not event_type:
        return event_type
    return EVENT_TYPE_MAP.get(event_type, event_type)


def log_proctor_event(student, exam, event_type: str, message: Optional[str] = None, image_bytes: Optional[bytes] = None) -> ProctorLog:
    """Centralized function to create ProctorLog and update session warning count.

    If image_bytes is provided, it will be saved as a screenshot attachment.
    """
    # create log with optional message
    normalized = _normalize_event_type(event_type)
    log = ProctorLog.objects.create(student=student, exam=exam, event_type=normalized, message=message or '')

    # attach screenshot if provided
    if image_bytes:
        try:
            filename = f'proctor_{student.id}_{exam.id}_{int(datetime.now().timestamp())}.jpg'
            log.image.save(filename, ContentFile(image_bytes), save=True)
        except Exception:
            logger.exception('failed to save screenshot for proctor event')

    # increment session warning_count for actual violations
    try:
        session, _ = StudentExamSession.objects.get_or_create(student=student, exam=exam)
        if normalized in {'no_face', 'multiple_faces', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 'right_click', 'suspicious_activity'}:
            session.warning_count = (session.warning_count or 0) + 1
        if not session.started_at:
            session.started_at = timezone.now()
        session.save()
    except Exception:
        logger.exception('failed to update StudentExamSession warning_count')

    return log
