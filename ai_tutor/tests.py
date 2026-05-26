from __future__ import annotations

import asyncio
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from ai_tutor.models import AIConversation, AIMessage
from ai_tutor.utils import active_exam_block_message
from proctor_ai.asgi import application
from proctoring.models import StudentExamSession, ProctorLog
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


def get_access_token_for_user(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


class AITutorTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='student@example.com', password='pass', role='student')
        self.teacher = User.objects.create_user(email='t@example.com', password='pass', role='teacher')

    def test_chat_endpoint_blocks_when_active_exam(self):
        from exams.models import Exam
        from django.utils import timezone
        start = timezone.now()
        exam = Exam.objects.create(title='T1', subject='Math', created_by=self.teacher, duration_minutes=60, max_questions=0, start_time=start, end_time=start, is_published=False)
        StudentExamSession.objects.create(student=self.user, exam=exam, status='ongoing')
        token = get_access_token_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.get('/api/ai/chat/')
        self.assertEqual(res.status_code, 403)
        self.assertIn(active_exam_block_message(), res.json().get('detail', ''))

    @patch('ai_tutor.services.ai_router.route_chat')
    def test_chat_endpoint_creates_conversation_and_reply(self, mock_route):
        class Resp:
            content = 'Hello student'
            provider = 'test'
            fallback = False

        mock_route.return_value = Resp()
        token = get_access_token_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.post('/api/ai/chat/', {'message': 'hi'}, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('conversation', data)
        conv = AIConversation.objects.filter(student=self.user).first()
        self.assertIsNotNone(conv)
        msgs = AIMessage.objects.filter(conversation=conv)
        self.assertTrue(msgs.filter(role='user').exists())
        self.assertTrue(msgs.filter(role='assistant').exists())

    def test_study_plan_endpoint_handles_proctor_timestamps(self):
        from django.utils import timezone
        from exams.models import Exam
        from results.models import Result

        now = timezone.now()
        exam = Exam.objects.create(
            title='T1',
            subject='Computer Science',
            created_by=self.teacher,
            duration_minutes=60,
            max_questions=0,
            start_time=now,
            end_time=now,
            is_published=False,
        )
        Result.objects.create(
            student=self.user,
            exam=exam,
            total_questions=10,
            correct_answers=8,
            score=8,
            percentage=80,
        )
        ProctorLog.objects.create(
            student=self.user,
            exam=exam,
            event_type='tab_switch',
            message='test warning',
        )

        token = get_access_token_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res = self.client.post('/api/ai/study-plan/', {'subject': 'Computer Science'}, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('plan', data)
        self.assertIn('generated', data)
        generated = data['generated']
        # Ensure the generated payload follows expected schema
        self.assertIn('title', generated)
        self.assertIn('daily_schedule', generated)
        self.assertIsInstance(generated['daily_schedule'], list)

    def _make_ws_token(self, user):
        return get_access_token_for_user(user)

    def test_consumer_rejects_when_active_exam(self):
        from exams.models import Exam
        from django.utils import timezone
        start = timezone.now()
        exam = Exam.objects.create(title='T1', subject='Math', created_by=self.teacher, duration_minutes=60, max_questions=0, start_time=start, end_time=start, is_published=False)
        StudentExamSession.objects.create(student=self.user, exam=exam, status='ongoing')
        token = self._make_ws_token(self.user)
        communicator = WebsocketCommunicator(application, f"/ws/ai-tutor/?token={token}")
        connected, _ = async_to_sync(communicator.connect)()
        # consumer should close immediately; not connected
        self.assertFalse(connected)

    def test_consumer_message_flow(self):
        class Resp:
            content = 'This is a streamed reply from AI for testing purposes.'
            provider = 'test'
            fallback = False

        # patch route_chat with a simple callable (not MagicMock) so sync_to_async can wrap it
        from ai_tutor.services import ai_router

        def fake_route(messages, *args, **kwargs):
            return Resp()

        ai_router.route_chat = fake_route

        # Unit test the consumer.receive_json logic by instantiating the consumer and
        # overriding send_json to capture outgoing messages. This avoids flakiness
        # around the full WebSocket ASGI test harness while still validating flow.
        from ai_tutor.consumers import AITutorConsumer

        received = []

        async def fake_send_json(payload):
            received.append(payload)

        consumer = AITutorConsumer()
        consumer.scope = {'user': self.user}
        consumer.send_json = fake_send_json

        # patch route_chat to return a simple response
        # run the async receive_json method
        async_to_sync(consumer.receive_json)({'action': 'chat', 'message': 'hello'})

        # ensure we recorded chunk/done messages
        types = [m.get('type') for m in received]
        self.assertIn('chunk', types)
        self.assertIn('done', types)
