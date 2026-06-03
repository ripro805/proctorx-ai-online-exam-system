from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class AIServiceError(RuntimeError):
    pass


def _post_json(url: str, payload: dict, headers: dict[str, str]) -> dict:
    data = json.dumps(payload).encode('utf-8')
    req = Request(url, data=data, headers={**headers, 'Content-Type': 'application/json'})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def generate_text(prompt: str, system_prompt: str = '', model: str | None = None, temperature: float = 0.5) -> str:
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise AIServiceError('Gemini API key not configured')
    model_name = model or os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'
    payload = {
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': temperature, 'maxOutputTokens': 1024},
    }
    if system_prompt:
        payload['systemInstruction'] = {'parts': [{'text': system_prompt}]}
    try:
        data = _post_json(url, payload, {})
        candidates = data.get('candidates') or []
        for candidate in candidates:
            parts = (((candidate.get('content') or {}).get('parts')) or [])
            texts = [part.get('text', '') for part in parts if isinstance(part, dict)]
            text = ''.join(texts).strip()
            if text:
                return text
        raise AIServiceError('Gemini returned no text')
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AIServiceError(f'Gemini request failed: {exc}') from exc


def generate_multimodal_text(prompt: str, system_prompt: str = '', images: list[dict[str, str]] | None = None, model: str | None = None, temperature: float = 0.2) -> str:
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise AIServiceError('Gemini API key not configured')
    model_name = model or os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')

    parts = [{'text': prompt}]
    for image in images or []:
        data = image.get('data') or image.get('base64')
        mime_type = image.get('mime_type') or image.get('mimeType') or 'image/png'
        if data:
            parts.append({'inlineData': {'mimeType': mime_type, 'data': data}})

    payload = {
        'contents': [{'role': 'user', 'parts': parts}],
        'generationConfig': {'temperature': temperature, 'maxOutputTokens': 1024},
    }
    if system_prompt:
        payload['systemInstruction'] = {'parts': [{'text': system_prompt}]}

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'
    try:
        data = _post_json(url, payload, {})
        candidates = data.get('candidates') or []
        for candidate in candidates:
            parts = (((candidate.get('content') or {}).get('parts')) or [])
            texts = [part.get('text', '') for part in parts if isinstance(part, dict)]
            text = ''.join(texts).strip()
            if text:
                return text
        raise AIServiceError('Gemini returned no text')
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AIServiceError(f'Gemini request failed: {exc}') from exc
