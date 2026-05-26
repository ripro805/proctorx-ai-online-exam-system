from __future__ import annotations

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from ai_tutor.models import AIConversation, AIMessage
from ai_tutor.services.ai_router import route_chat
from ai_tutor.utils import active_exam_block_message, has_active_exam_session, weak_subjects_for_student


class AITutorConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated or user.role != 'student':
            await self.close(code=4401)
            return
        if await sync_to_async(has_active_exam_session)(user):
            await self.close(code=4403)
            return
        await self.accept()

    async def receive_json(self, content, **kwargs):
        user = self.scope.get('user')
        if not user or not user.is_authenticated or user.role != 'student':
            await self.send_json({'type': 'error', 'detail': 'Unauthorized'})
            return
        if await sync_to_async(has_active_exam_session)(user):
            await self.send_json({'type': 'error', 'detail': active_exam_block_message()})
            return

        action = content.get('action', 'chat')
        conversation_id = content.get('conversation_id')
        message = (content.get('message') or content.get('transcript') or '').strip()
        subject = content.get('subject') or ''

        if action not in {'chat', 'voice'} or not message:
            await self.send_json({'type': 'error', 'detail': 'message required'})
            return

        conversation = await sync_to_async(self._get_or_create_conversation)(user, conversation_id, action, subject)
        await sync_to_async(self._save_message)(conversation, 'user', message, 'student')
        messages = await sync_to_async(self._conversation_messages)(conversation)
        context = {
            'subject': subject,
            'weak_subjects': await sync_to_async(weak_subjects_for_student)(user),
        }
        response = await sync_to_async(route_chat)(messages, '', context)
        await sync_to_async(self._save_message)(conversation, 'assistant', response.content, response.provider)

        for chunk in self._stream_chunks(response.content):
            await self.send_json({
                'type': 'chunk',
                'conversation_id': conversation.id,
                'provider': response.provider,
                'fallback': response.fallback,
                'delta': chunk,
            })
        await self.send_json({
            'type': 'done',
            'conversation_id': conversation.id,
            'provider': response.provider,
            'fallback': response.fallback,
            'message': response.content,
        })

    def _get_or_create_conversation(self, user, conversation_id, action, subject):
        if conversation_id:
            conversation = AIConversation.objects.filter(id=conversation_id, student=user).first()
            if conversation:
                return conversation
        return AIConversation.objects.create(student=user, title='AI Tutor Chat', subject=subject, mode='voice' if action == 'voice' else 'chat')

    def _save_message(self, conversation, role, content, provider=''):
        AIMessage.objects.create(conversation=conversation, role=role, content=content, provider=provider)

    def _conversation_messages(self, conversation):
        return [
            {'role': msg.role, 'content': msg.content}
            for msg in conversation.messages.order_by('created_at', 'id')[:20]
        ]

    def _stream_chunks(self, text):
        words = text.split()
        if not words:
            yield text
            return
        buffer = []
        for word in words:
            buffer.append(word)
            if len(buffer) >= 8:
                yield ' '.join(buffer) + ' '
                buffer = []
        if buffer:
            yield ' '.join(buffer)
