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


def generate_text(prompt: str, system_prompt: str = '', model: str | None = None, temperature: float = 0.5) -> str:
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise AIServiceError('OpenAI API key not configured')
    model_name = model or os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})
    try:
        data = _post_json(
            'https://api.openai.com/v1/chat/completions',
            {'model': model_name, 'messages': messages, 'temperature': temperature},
            {'Authorization': f'Bearer {api_key}'},
        )
        choices = data.get('choices') or []
        for choice in choices:
            message = choice.get('message') or {}
            text = (message.get('content') or '').strip()
            if text:
                return text
        raise AIServiceError('OpenAI returned no text')
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AIServiceError(f'OpenAI request failed: {exc}') from exc


def generate_multimodal_text(prompt: str, system_prompt: str = '', images: list[dict[str, str]] | None = None, model: str | None = None, temperature: float = 0.2) -> str:
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise AIServiceError('OpenAI API key not configured')
    model_name = model or os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})

    user_content: list[dict[str, object]] = [{'type': 'text', 'text': prompt}]
    for image in images or []:
        url = image.get('url') or image.get('data_url')
        if not url:
            continue
        user_content.append({'type': 'image_url', 'image_url': {'url': url}})

    messages.append({'role': 'user', 'content': user_content})

    try:
        data = _post_json(
            'https://api.openai.com/v1/chat/completions',
            {'model': model_name, 'messages': messages, 'temperature': temperature},
            {'Authorization': f'Bearer {api_key}'},
        )
        choices = data.get('choices') or []
        for choice in choices:
            message = choice.get('message') or {}
            text = (message.get('content') or '').strip()
            if text:
                return text
        raise AIServiceError('OpenAI returned no text')
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AIServiceError(f'OpenAI request failed: {exc}') from exc
