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
        # try to recover a JSON substring from the text
        try:
            start_candidates = [i for i in (text.find('{'), text.find('[')) if i >= 0]
            start = min(start_candidates) if start_candidates else -1
            if start >= 0:
                for end in range(len(text), start, -1):
                    snippet = text[start:end]
                    try:
                        return json.loads(snippet)
                    except Exception:
                        continue
        except Exception:
            pass
        return None


def _safe_json_snippet(value: Any, limit: int = 1200) -> str:
    try:
        return json.dumps(value, default=str)[:limit]
    except Exception:
        return str(value)[:limit]


def _study_plan_fallback(subject: str, context: dict[str, Any]) -> dict[str, Any]:
    student_name = context.get('student_name') or 'Student'
    exam = context.get('selected_exam') or {}
    exam_title = exam.get('title') or 'your upcoming exam'
    exam_date = exam.get('date') or 'soon'
    weak_subjects = context.get('weak_subjects') or []
    top_weak = [item.get('subject', 'General') for item in weak_subjects[:3]] or ['General revision']
    study_hours = context.get('study_hours_per_day') or 3
    pace = context.get('learning_pace') or 'steady'
    difficulty = context.get('difficulty_level') or 'balanced'

    return {
        'title': f'🎯 Personalized Study Plan for {subject}',
        'student_name': student_name,
        'exam_title': exam_title,
        'exam_date': exam_date,
        'introduction': (
            f'Hello {student_name}, this roadmap is designed around {exam_title}, your current performance, '
            f'and a {pace} learning pace so you can study smarter, not just longer.'
        ),
        'study_goals': [
            'Strengthen the weakest subjects first',
            'Keep a daily revision loop for previously covered topics',
            'Complete one mock test cycle before the final countdown',
            'Protect focus time with realistic breaks and sleep',
        ],
        'daily_schedule': [
            {
                'time': '07:00 - 08:30',
                'title': f'High-focus block for {top_weak[0]}',
                'duration': '90 min',
                'method': 'Active recall + short notes',
                'outcome': 'Rebuild confidence in the weakest concept set',
            },
            {
                'time': '13:30 - 15:00',
                'title': 'Core concept practice',
                'duration': '90 min',
                'method': 'Worked examples + MCQs',
                'outcome': 'Turn theory into exam-ready memory',
            },
            {
                'time': '20:00 - 21:00',
                'title': 'Revision sprint',
                'duration': '60 min',
                'method': 'Quick recap + error log',
                'outcome': 'Lock in the day’s learning before sleep',
            },
        ],
        'weekly_strategy': [
            {
                'day': 'Monday',
                'theme': f'Foundation reset for {subject}',
                'tasks': ['Review lecture notes', 'Solve 10 MCQs', 'Write 1-page summary'],
                'checkpoint': 'Finish with a 5-minute self-quiz',
            },
            {
                'day': 'Wednesday',
                'theme': 'Weak topic repair day',
                'tasks': ['Revise the lowest-score topic', 'Use flashcards', 'Update mistakes log'],
                'checkpoint': 'Track accuracy improvement',
            },
            {
                'day': 'Friday',
                'theme': 'Mock-test readiness',
                'tasks': ['Timed practice', 'Mark weak answers', 'Review explanations'],
                'checkpoint': 'Compare score with last attempt',
            },
        ],
        'subject_priorities': [
            {
                'subject': subject,
                'priority': 'High',
                'allocation': '40%',
                'reason': f'Your current plan should lean toward {difficulty} depth practice and exam-specific revision.',
            },
            {
                'subject': top_weak[0],
                'priority': 'Very High',
                'allocation': '35%',
                'reason': 'Lowest confidence area from recent analytics.',
            },
            {
                'subject': top_weak[1] if len(top_weak) > 1 else 'Revision buffer',
                'priority': 'Medium',
                'allocation': '25%',
                'reason': 'Needed for balance and recall reinforcement.',
            },
        ],
        'weak_area_focus': {
            'summary': 'Spend extra attention on the low-score areas before adding new content.',
            'topics': top_weak,
            'strategies': ['Practice daily retrieval', 'Summarize with your own words', 'Re-solve missed questions'],
        },
        'revision_timeline': [
            {
                'phase': 'Weeks 1-2',
                'focus': 'Rebuild core understanding',
                'actions': ['Read once, revise twice', 'Create topic maps', 'Do short quizzes'],
            },
            {
                'phase': 'Weeks 3-4',
                'focus': 'Speed and accuracy',
                'actions': ['Timed MCQ sets', 'Formula review', 'Error log cleanup'],
            },
            {
                'phase': 'Final 7 days',
                'focus': 'Exam simulation only',
                'actions': ['No new topics', 'Two mocks per day', 'Light evening revision'],
            },
        ],
        'mock_test_schedule': [
            {
                'label': 'Mock Test 1',
                'cadence': 'This weekend',
                'duration': 'Full duration',
                'format': 'Mixed difficulty',
                'objective': 'Baseline your current readiness',
            },
            {
                'label': 'Mock Test 2',
                'cadence': 'Mid-week next cycle',
                'duration': 'Timed 60–90 min',
                'format': 'Topic-focused',
                'objective': 'Measure weak-area recovery',
            },
            {
                'label': 'Mock Test 3',
                'cadence': 'Final 3 days',
                'duration': 'Short simulation',
                'format': 'High-pressure review',
                'objective': 'Build calmness under exam conditions',
            },
        ],
        'productivity_tips': [
            'Use 50/10 or 25/5 focus cycles depending on difficulty.',
            'Keep a mistake notebook and revisit it every night.',
            'Stop one hour before sleep and do only light revision.',
            'Practice one topic, one summary, one quiz loop each day.',
        ],
        'motivation': {
            'headline': 'You do not need to study perfectly — only consistently.',
            'message': 'Small daily wins compound fast. Stay steady, keep reviewing, and your score will follow the work.',
        },
        'sleep_break_recommendations': {
            'sleep_hours': 7.0,
            'break_pattern': '25-30 minute focused blocks with 5-10 minute resets',
            'notes': 'Hydrate often, take a longer break after two intense blocks, and protect your sleep the night before exams.',
        },
        'final_revision_countdown': [
            {
                'window': '7 days out',
                'actions': ['Stop learning new chapters', 'Revise only high-yield notes', 'Run one mock each day'],
            },
            {
                'window': '3 days out',
                'actions': ['Focus on errors only', 'Review formulas and definitions', 'Keep study sessions lighter'],
            },
            {
                'window': 'Exam eve',
                'actions': ['Very short recap', 'Prepare materials early', 'Sleep on time'],
            },
        ],
        'progress_overview': {
            'study_hours_per_day': study_hours,
            'pace': pace,
            'difficulty_level': difficulty,
            'weak_topics': weak_subjects,
        },
        'calendar_view': [
            {'day': 'Mon', 'focus': top_weak[0], 'style': 'Deep work'},
            {'day': 'Tue', 'focus': 'Practice + recall', 'style': 'Balanced'},
            {'day': 'Wed', 'focus': top_weak[1] if len(top_weak) > 1 else 'Revision', 'style': 'Recovery'},
            {'day': 'Thu', 'focus': subject, 'style': 'Timed practice'},
            {'day': 'Fri', 'focus': 'Mock test', 'style': 'Exam mode'},
            {'day': 'Sat', 'focus': 'Review mistakes', 'style': 'Consolidate'},
            {'day': 'Sun', 'focus': 'Light revision + reset', 'style': 'Recharge'},
        ],
    }


def generate_study_plan(subject: str, context: dict[str, Any]) -> dict[str, Any]:
    prompt = f"""
You are an elite academic mentor and premium EdTech study strategist.
Create a highly personalized study plan for {subject} using the provided context.

User context:
{_safe_json_snippet(context)}

Return ONLY valid JSON with these top-level keys:
- title
- student_name
- exam_title
- exam_date
- introduction
- study_goals (array of strings)
- daily_schedule (array of objects with time, title, duration, method, outcome)
- weekly_strategy (array of objects with day, theme, tasks, checkpoint)
- subject_priorities (array of objects with subject, priority, allocation, reason)
- weak_area_focus (object with summary, topics, strategies)
- revision_timeline (array of objects with phase, focus, actions)
- mock_test_schedule (array of objects with label, cadence, duration, format, objective)
- productivity_tips (array of strings)
- motivation (object with headline, message)
- sleep_break_recommendations (object with sleep_hours, break_pattern, notes)
- final_revision_countdown (array of objects with window, actions)
- progress_overview (object)
- calendar_view (array of objects with day, focus, style)

Tone: motivational, intelligent, realistic, and concise-but-detailed.
Style: premium, modern, structured, and actionable.
Do not include markdown fences or commentary.
""".strip()
    response = route_chat([
        {'role': 'user', 'content': prompt},
    ], system_prompt='Return only valid JSON. The JSON must be valid and directly parseable.')
    parsed = _json_from_response(response.content)
    return _normalize_study_plan_payload(parsed, subject, context, response)


def _normalize_study_plan_payload(raw: Any, subject: str, context: dict[str, Any], response: AIResponse) -> dict[str, Any]:
    if isinstance(raw, dict):
        raw.setdefault('provider', response.provider)
        raw.setdefault('fallback', response.fallback)
        raw.setdefault('subject', subject)
        return raw
    # fallback content
    return _study_plan_fallback(subject, context) | {'provider': response.provider, 'fallback': response.fallback}


def generate_quiz(topic: str, difficulty: str, count: int, context: dict[str, Any]) -> dict[str, Any]:
    system_prompt = (
        "You are an expert university exam question writer. Produce realistic, professional, subject-wise MCQs "
        "that resemble real university examinations. Follow these rules strictly:\n"
        "- Generate only valid JSON (no markdown, no commentary).\n"
        "- Return a top-level object with keys: topic, difficulty, provider_notes(optional), questions (array).\n"
        "- questions: array of objects with keys: question (string), options (object with keys A,B,C,D), "
        "correct_answer (one of 'A','B','C','D'), explanation (string).\n"
        "- Questions must be concept-based, analytical where appropriate, and avoid placeholders like 'Option A' or 'Question 1'.\n"
        "- Options must be meaningful distractors, not repeated, and use domain terminology.\n"
        "- Match the requested difficulty: Easy=fundamentals, Medium=conceptual reasoning, Hard=analytical/problem-solving.\n"
        "- Supported subjects include Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, "
        "Software Engineering, AI, Machine Learning, OOP, Compiler Design, Cyber Security.\n"
        "- Generate exactly the requested count of UNIQUE questions.\n"
        f"Context: {_safe_json_snippet(context)}\n"
    )

    user_msg = (
        f"Generate professional university-level MCQ questions for the subject/topic: {topic}.\n"
        f"Difficulty level: {difficulty}.\n"
        f"Count: {count}.\n"
        "Return JSON in this format exactly:\n"
        "{\n  \"topic\": \"...\",\n  \"difficulty\": \"...\",\n  \"questions\": [\n    {\n      \"question\": \"...\",\n      \"options\": { \"A\": \"...\", \"B\": \"...\", \"C\": \"...\", \"D\": \"...\" },\n      \"correct_answer\": \"A\",\n      \"explanation\": \"...\"\n    }\n  ]\n}\n"
    )

    max_attempts = 2
    attempt = 0
    last_response = None
    while attempt < max_attempts:
        attempt += 1
        response = route_chat([
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_msg},
        ], system_prompt=system_prompt, context=context)
        last_response = response
        parsed = _json_from_response(response.content)
        validated = _validate_quiz_payload(parsed, topic, difficulty, count)
        if validated is not None:
            validated.setdefault('provider', response.provider)
            validated.setdefault('fallback', response.fallback)
            return validated

    # If generation failed, return a deterministic non-placeholder fallback and mark fallback=True
    questions = []
    for i in range(max(1, count)):
        questions.append({
            'question': f'[{topic}] Review question {i+1}: Explain the primary concept behind {topic}.',
            'options': {
                'A': 'Fundamental definition or property',
                'B': 'A common misconception/distractor',
                'C': 'An advanced related concept',
                'D': 'An unrelated technique',
            },
            'correct_answer': 'A',
            'explanation': 'Answer A is the foundational definition; other options are distractors.',
        })
    return {
        'provider': last_response.provider if last_response else 'fallback',
        'fallback': True,
        'topic': topic,
        'difficulty': difficulty,
        'questions': questions,
    }


def _is_placeholder_text(s: Any) -> bool:
    if not isinstance(s, str):
        return True
    low = s.strip().lower()
    placeholders = ['option a', 'option b', 'option c', 'option d', 'option', 'lorem', 'placeholder', 'option a.', 'option b.', 'question']
    if len(low) < 4:
        return True
    for p in placeholders:
        if p in low:
            return True
    return False


def _validate_quiz_payload(parsed: Any, topic: str, difficulty: str, count: int) -> dict[str, Any] | None:
    if not isinstance(parsed, dict):
        return None
    questions = parsed.get('questions')
    if not isinstance(questions, list) or len(questions) < max(1, count):
        return None
    normalized_questions = []
    seen_questions = set()
    for q in questions[:count]:
        if not isinstance(q, dict):
            return None
        question_text = q.get('question') or q.get('stem')
        options = q.get('options')
        correct = q.get('correct_answer') or q.get('correct_option') or q.get('answer')
        explanation = q.get('explanation') or q.get('explain')
        if not (isinstance(question_text, str) and question_text.strip()):
            return None
        if question_text.strip() in seen_questions:
            return None
        seen_questions.add(question_text.strip())
        if not isinstance(options, dict):
            return None
        if not all(k in options for k in ('A', 'B', 'C', 'D')):
            return None
        for k in ('A', 'B', 'C', 'D'):
            val = options.get(k)
            if _is_placeholder_text(val):
                return None
        if not (isinstance(correct, str) and correct.strip().upper() in ('A', 'B', 'C', 'D')):
            return None
        if not (isinstance(explanation, str) and len(explanation.strip()) > 10):
            return None
        normalized_questions.append({
            'question': question_text.strip(),
            'options': {k: options[k].strip() for k in ('A', 'B', 'C', 'D')},
            'correct_answer': correct.strip().upper(),
            'explanation': explanation.strip(),
        })
    return {
        'topic': parsed.get('topic') or topic,
        'difficulty': parsed.get('difficulty') or difficulty,
        'questions': normalized_questions,
    }
