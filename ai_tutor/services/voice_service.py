from __future__ import annotations

from typing import Any

from .ai_router import route_chat


def generate_voice_reply(transcript: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    context = context or {}
    response = route_chat([
        {'role': 'user', 'content': transcript},
    ], system_prompt='Respond concisely and helpfully for a voice tutor session.', context=context)
    return {
        'text': response.content,
        'provider': response.provider,
        'fallback': response.fallback,
    }
