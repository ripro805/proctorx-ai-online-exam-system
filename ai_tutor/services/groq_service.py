from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .gemini_service import AIServiceError


def _post_json(url: str, payload: dict, headers: dict[str, str]) -> dict:
    data = json.dumps(payload).encode('utf-8')
    req = Request(url, data=data, headers={**headers, 'Content-Type': 'application/json'})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def generate_text(prompt: str, system_prompt: str = '', model: str | None = None) -> str:
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        raise AIServiceError('Groq API key not configured')
    model_name = model or os.environ.get('GROQ_MODEL', 'llama-3.1-70b-versatile')
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})
    try:
        data = _post_json(
            'https://api.groq.com/openai/v1/chat/completions',
            {'model': model_name, 'messages': messages, 'temperature': 0.5},
            {'Authorization': f'Bearer {api_key}'},
        )
        choices = data.get('choices') or []
        for choice in choices:
            message = choice.get('message') or {}
            text = (message.get('content') or '').strip()
            if text:
                return text
        raise AIServiceError('Groq returned no text')
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AIServiceError(f'Groq request failed: {exc}') from exc
