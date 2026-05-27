from __future__ import annotations

import json
from difflib import SequenceMatcher
from typing import Any

from exams.models import QuestionType

from .ai_router import _json_from_response, route_chat
from .gemini_service import AIServiceError, generate_multimodal_text as gemini_generate_multimodal_text
from .openai_service import generate_multimodal_text as openai_generate_multimodal_text


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _normalize_text(value: Any) -> str:
    return ' '.join(str(value or '').strip().split()).lower()


def _extract_data_url(value: Any) -> tuple[str | None, str | None]:
    if not isinstance(value, str) or not value.strip():
        return None, None
    if value.startswith('data:') and ';base64,' in value:
        header, encoded = value.split(';base64,', 1)
        mime_type = header[5:] or 'image/png'
        return mime_type, encoded
    return 'image/png', value


def _fallback_subjective_result(reference_answer: str, student_answer: str, marks: int) -> dict[str, Any]:
    ref = _normalize_text(reference_answer)
    stu = _normalize_text(student_answer)
    if not ref or not stu:
        return {
            'is_correct': False,
            'score_awarded': 0,
            'confidence': 0,
            'feedback': 'No answer submitted or the reference answer is missing.',
            'matched_points': [],
            'missing_points': [],
            'provider': 'fallback',
            'fallback': True,
        }

    similarity = SequenceMatcher(None, ref, stu).ratio()
    ref_tokens = set(ref.split())
    stu_tokens = set(stu.split())
    token_overlap = len(ref_tokens & stu_tokens) / len(ref_tokens) if ref_tokens else 0.0
    score_ratio = max(similarity, token_overlap)
    is_correct = similarity >= 0.72 or token_overlap >= 0.65
    score_awarded = float(marks if is_correct else round(marks * score_ratio * 0.5, 2))

    return {
        'is_correct': is_correct,
        'concept_match': is_correct,
        'score_awarded': _clamp(score_awarded, 0.0, float(marks)),
        'confidence': round(score_ratio, 2),
        'feedback': 'Matched the reference answer well.' if is_correct else 'The answer is partially correct or misses key points.',
        'matched_points': [],
        'missing_points': [],
        'provider': 'fallback',
        'fallback': True,
    }


def _normalize_ai_result(raw: Any, marks: int, fallback_payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return fallback_payload

    is_correct = bool(raw.get('is_correct'))
    score_awarded = raw.get('score_awarded', raw.get('score', raw.get('marks_awarded', 0)))
    try:
        score_awarded = float(score_awarded)
    except Exception:
        score_awarded = float(marks if is_correct else 0)

    if score_awarded <= 1 and marks > 1:
        score_awarded *= marks
    score_awarded = _clamp(score_awarded, 0.0, float(marks))

    try:
        confidence = _clamp(float(raw.get('confidence', 0)), 0.0, 1.0)
    except Exception:
        confidence = 0.0

    return {
        'is_correct': is_correct,
        'concept_match': bool(raw.get('concept_match', is_correct)),
        'score_awarded': score_awarded,
        'confidence': confidence,
        'feedback': str(raw.get('feedback') or raw.get('reason') or ''),
        'matched_points': raw.get('matched_points') or [],
        'missing_points': raw.get('missing_points') or [],
        'provider': raw.get('provider') or fallback_payload.get('provider') or 'ai',
        'fallback': bool(raw.get('fallback', False)),
    }


def _build_text_prompt(question_text: str, reference_answer: str, student_answer: str, exam_subject: str, marks: int) -> str:
    payload = {
        'question': question_text,
        'subject': exam_subject,
        'reference_answer': reference_answer,
        'student_answer': student_answer,
        'marks': marks,
    }
    return (
        'You are grading a university exam answer. Evaluate the student response against the teacher reference by meaning, not by exact wording. '
        'Paraphrases, synonyms, reordered sentences, and equivalent explanations should be accepted if they preserve the same concept. '
        'Return ONLY valid JSON with keys: is_correct (boolean), score_awarded (number), confidence (0 to 1), '
        'feedback (string), matched_points (array of strings), missing_points (array of strings), concept_match (boolean). '
        'Use the full mark when the concept is correct even if the wording differs. Assign partial credit when the answer captures the main concept but misses secondary points. '
        'Reject only when the core concept is wrong or missing. '
        f'Payload: {json.dumps(payload, ensure_ascii=False)}'
    )


def _build_image_prompt(question_text: str, exam_subject: str, marks: int) -> str:
    return (
        'You are grading an image-based university exam answer. Compare the student image with the teacher reference image '
        'and judge whether they represent the same expected answer. Return ONLY valid JSON with keys: '
        'is_correct (boolean), score_awarded (number), confidence (0 to 1), feedback (string), matched_points (array of strings), missing_points (array of strings). '
        'Give full marks only when the visual answer clearly matches the reference. '
        f'Question: {question_text} | Subject: {exam_subject} | Marks: {marks}'
    )


def _text_grade_via_ai(prompt: str) -> dict[str, Any] | None:
    system_prompt = 'Return only valid JSON. Do not include markdown fences or commentary.'
    try:
        response = route_chat([
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': prompt},
        ], system_prompt=system_prompt)
        parsed = _json_from_response(response.content)
        if isinstance(parsed, dict):
            parsed.setdefault('provider', response.provider)
            parsed.setdefault('fallback', response.fallback)
            return parsed
    except AIServiceError:
        return None
    except Exception:
        return None
    return None


def _multimodal_grade_via_ai(prompt: str, images: list[dict[str, str]]) -> dict[str, Any] | None:
    system_prompt = 'Return only valid JSON. Do not include markdown fences or commentary.'
    providers = (
        ('openai', openai_generate_multimodal_text),
        ('gemini', gemini_generate_multimodal_text),
    )
    for provider, fn in providers:
        try:
            response = fn(prompt=prompt, system_prompt=system_prompt, images=images)
            parsed = _json_from_response(response)
            if isinstance(parsed, dict):
                parsed.setdefault('provider', provider)
                parsed.setdefault('fallback', False)
                return parsed
        except AIServiceError:
            continue
        except Exception:
            continue
    return None


def grade_subjective_answer(question, answer_payload: dict[str, Any], exam_subject: str = '') -> dict[str, Any]:
    marks = int(getattr(question, 'marks', 1) or 1)
    question_text = getattr(question, 'text', '') or ''
    reference = getattr(question, 'correct_answer_data', {}) or {}

    if question.question_type == QuestionType.DESCRIPTION:
        student_answer = answer_payload.get('text') or answer_payload.get('answer_text') or answer_payload.get('description') or ''
        reference_answer = reference.get('text') or reference.get('answer') or ''
        fallback_payload = _fallback_subjective_result(reference_answer, student_answer, marks)
        ai_payload = _text_grade_via_ai(_build_text_prompt(question_text, reference_answer, student_answer, exam_subject, marks))
        return _normalize_ai_result(ai_payload, marks, fallback_payload) if ai_payload else fallback_payload

    if question.question_type == QuestionType.IMAGE:
        student_image = answer_payload.get('image') or answer_payload.get('answer_image') or ''
        reference_image = reference.get('image') or ''
        fallback_payload = {
            **_fallback_subjective_result(reference_image, student_image, marks),
            'feedback': 'Image answer compared using fallback matching.' if student_image and reference_image else 'No image answer submitted or reference missing.',
        }

        student_mime, student_data = _extract_data_url(student_image)
        reference_mime, reference_data = _extract_data_url(reference_image)
        images = []
        if student_data:
            images.append({'mime_type': student_mime or 'image/png', 'data': student_data})
        if reference_data:
            images.append({'mime_type': reference_mime or 'image/png', 'data': reference_data})

        ai_payload = _multimodal_grade_via_ai(_build_image_prompt(question_text, exam_subject, marks), images)
        return _normalize_ai_result(ai_payload, marks, fallback_payload) if ai_payload else fallback_payload

    return {
        'is_correct': False,
        'concept_match': False,
        'score_awarded': 0,
        'confidence': 0,
        'feedback': 'Unsupported question type for subjective grading.',
        'matched_points': [],
        'missing_points': [],
        'provider': 'fallback',
        'fallback': True,
    }