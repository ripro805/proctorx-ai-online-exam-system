from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from .gemini_service import generate_text as gemini_generate_text, AIServiceError
from .groq_service import generate_text as groq_generate_text
from .openai_service import generate_text as openai_generate_text


@dataclass
class AIResponse:
    content: str
    provider: str
    fallback: bool = False


def _messages_to_prompt(messages: list[dict[str, str]]) -> str:
    lines = []
    for msg in messages:
        role = (msg.get('role') or 'user').upper()
        content = msg.get('content') or ''
        lines.append(f'{role}: {content}')
    return '\n'.join(lines).strip()


def _fallback_text(prompt: str, context: dict[str, Any] | None = None) -> str:
    context = context or {}
    subject = context.get('subject') or 'your subject'
    weak = context.get('weak_subjects') or []
    weak_line = ', '.join(item.get('subject', '') for item in weak[:3]) if weak else 'focus on recent mistakes'
    return (
        f'I’m your AI study companion for {subject}.\n\n'
        f'Prompt summary: {prompt[:180]}\n\n'
        f'Quick focus areas: {weak_line}.\n'
        f'Next step: review one concept, solve 3 practice questions, then revise your notes.'
    )


def route_chat(messages: list[dict[str, str]], system_prompt: str = '', context: dict[str, Any] | None = None) -> AIResponse:
    prompt = _messages_to_prompt(messages)
    providers = (
        ('gemini', gemini_generate_text),
        ('openai', openai_generate_text),
        ('groq', groq_generate_text),
    )
    last_error = None
    for provider, fn in providers:
        try:
            content = fn(prompt=prompt, system_prompt=system_prompt)
            return AIResponse(content=content, provider=provider)
        except AIServiceError as exc:
            last_error = exc
    if last_error:
        return AIResponse(content=_fallback_text(prompt, context=context), provider='fallback', fallback=True)
    return AIResponse(content=_fallback_text(prompt, context=context), provider='fallback', fallback=True)


def _json_from_response(text: str) -> Any:
    text = text.strip()
    if text.startswith('```'):
        text = text.strip('`')
    try:
        return json.loads(text)
    except Exception:
        return None


def generate_study_plan(subject: str, context: dict[str, Any]) -> dict[str, Any]:
    prompt = (
        f'Create a JSON study plan for {subject}. Include daily_schedule, revision_strategy, weak_subjects, '
        f'quick_wins, and motivation. Context: {json.dumps(context)[:1200]}.'
    )
    response = route_chat([
        {'role': 'user', 'content': prompt},
    ], system_prompt='Return only valid JSON.')
    parsed = _json_from_response(response.content)
    if isinstance(parsed, dict):
        parsed.setdefault('provider', response.provider)
        parsed.setdefault('fallback', response.fallback)
        return parsed
    return {
        'provider': response.provider,
        'fallback': response.fallback,
        'subject': subject,
        'daily_schedule': [
            {'time': '07:00', 'task': 'Review notes'},
            {'time': '18:00', 'task': 'Practice questions'},
        ],
        'revision_strategy': 'Study weak topics first, then attempt a short quiz.',
        'weak_subjects': context.get('weak_subjects', []),
        'quick_wins': ['Revise formulas', 'Summarize one chapter', 'Solve 5 MCQs'],
    }


def generate_quiz(topic: str, difficulty: str, count: int, context: dict[str, Any]) -> dict[str, Any]:
    prompt = (
        f'Create a JSON MCQ quiz on {topic}. Difficulty: {difficulty}. Count: {count}. '
        f'Each question should have question, options, correct_option, explanation. Context: {json.dumps(context)[:1200]}.'
    )
    response = route_chat([
        {'role': 'user', 'content': prompt},
    ], system_prompt='Return only valid JSON.')
    parsed = _json_from_response(response.content)
    if isinstance(parsed, dict):
        parsed.setdefault('provider', response.provider)
        parsed.setdefault('fallback', response.fallback)
        return parsed
    questions = []
    for idx in range(max(1, count)):
        questions.append({
            'question': f'{topic} question {idx + 1}',
            'options': ['A', 'B', 'C', 'D'],
            'correct_option': 'A',
            'explanation': 'Review the core concept and compare all options carefully.',
        })
    return {'provider': response.provider, 'fallback': response.fallback, 'topic': topic, 'difficulty': difficulty, 'questions': questions}
