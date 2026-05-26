from __future__ import annotations

from typing import Any

from .ai_router import generate_study_plan as _generate_study_plan


def generate_study_plan(subject: str, context: dict[str, Any]) -> dict[str, Any]:
    return _generate_study_plan(subject=subject, context=context)
