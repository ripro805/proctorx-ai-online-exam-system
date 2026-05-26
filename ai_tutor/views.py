from __future__ import annotations

from django.db.models import Avg
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_tutor.models import AIConversation, AIMessage, AIQuiz, AIStudyPlan
from ai_tutor.serializers import AIConversationSerializer, AIQuizSerializer, AIStudyPlanSerializer
from ai_tutor.services.ai_router import generate_quiz, route_chat
from ai_tutor.services.planner_service import generate_study_plan
from ai_tutor.services.voice_service import generate_voice_reply
from ai_tutor.utils import active_exam_block_message, has_active_exam_session, upcoming_exams_for_student, weak_subjects_for_student
from core.permissions import IsStudent
from exams.models import Exam
from proctoring.models import ProctorLog
from results.models import Result


def _guard_student_ai(request):
    if has_active_exam_session(request.user):
        return Response({'detail': active_exam_block_message()}, status=status.HTTP_403_FORBIDDEN)
    return None


class AIChatAPIView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        conversation_id = request.query_params.get('conversation_id')
        if conversation_id:
            conversation = AIConversation.objects.filter(id=conversation_id, student=request.user).first()
            if not conversation:
                return Response({'detail': 'conversation not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'conversation': AIConversationSerializer(conversation).data}, status=status.HTTP_200_OK)
        conversations = AIConversation.objects.filter(student=request.user).prefetch_related('messages').order_by('-updated_at')[:20]
        return Response({'conversations': AIConversationSerializer(conversations, many=True).data}, status=status.HTTP_200_OK)

    def post(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        message = (request.data.get('message') or request.data.get('transcript') or '').strip()
        subject = request.data.get('subject') or ''
        conversation_id = request.data.get('conversation_id')
        action = request.data.get('action', 'chat')
        if not message:
            return Response({'detail': 'message required'}, status=status.HTTP_400_BAD_REQUEST)
        conversation = None
        if conversation_id:
            conversation = AIConversation.objects.filter(id=conversation_id, student=request.user).first()
        if not conversation:
            conversation = AIConversation.objects.create(student=request.user, title='AI Tutor Chat', subject=subject, mode='voice' if action == 'voice' else 'chat')
        AIMessage.objects.create(conversation=conversation, role='user', content=message, provider='student')
        context = {
            'subject': subject,
            'weak_subjects': weak_subjects_for_student(request.user),
        }
        if action == 'voice':
            response = generate_voice_reply(message, context=context)
            reply_text = response['text']
        else:
            response = route_chat([{'role': 'user', 'content': message}], context=context)
            reply_text = response.content
        AIMessage.objects.create(conversation=conversation, role='assistant', content=reply_text, provider=response['provider'])
        conversation.title = conversation.title or message[:60]
        conversation.mode = 'voice' if action == 'voice' else 'chat'
        conversation.subject = subject or conversation.subject
        conversation.save(update_fields=['title', 'mode', 'subject', 'updated_at'])
        response_payload = response if action == 'voice' else {
            'text': reply_text,
            'provider': response.provider,
            'fallback': response.fallback,
        }
        return Response({'conversation': AIConversationSerializer(conversation).data, 'response': response_payload}, status=status.HTTP_200_OK)


class AIStudyPlanAPIView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        plans = AIStudyPlan.objects.filter(student=request.user).select_related('exam').order_by('-updated_at')[:10]
        return Response({'study_plans': AIStudyPlanSerializer(plans, many=True).data}, status=status.HTTP_200_OK)

    def post(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        subject = request.data.get('subject') or 'General'
        exam_id = request.data.get('exam_id')
        exam = None
        if exam_id:
            exam = Exam.objects.filter(id=exam_id).first()
        context = {
            'weak_subjects': weak_subjects_for_student(request.user),
            'upcoming_exams': upcoming_exams_for_student(request.user),
            'recent_scores': list(Result.objects.filter(student=request.user).order_by('-created_at').values('exam__title', 'percentage')[:5]),
            'recent_warnings': list(ProctorLog.objects.filter(student=request.user).order_by('-timestamp').values('event_type', 'timestamp')[:5]),
        }
        plan_data = generate_study_plan(subject, context)
        plan, _ = AIStudyPlan.objects.update_or_create(
            student=request.user,
            subject=subject,
            exam=exam,
            defaults={'plan_data': plan_data, 'progress_data': plan_data.get('progress_data', {})},
        )
        return Response({'plan': AIStudyPlanSerializer(plan).data, 'generated': plan_data}, status=status.HTTP_200_OK)


class AIQuizAPIView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        topic = request.data.get('topic') or request.data.get('subject') or 'General'
        difficulty = request.data.get('difficulty') or 'medium'
        count = int(request.data.get('count') or 5)
        quiz_data = generate_quiz(topic, difficulty, count, {
            'weak_subjects': weak_subjects_for_student(request.user),
        })
        quiz = AIQuiz.objects.create(student=request.user, topic=topic, difficulty=difficulty, quiz_data=quiz_data, provider=quiz_data.get('provider', 'fallback'))
        return Response({'quiz': AIQuizSerializer(quiz).data, 'generated': quiz_data}, status=status.HTTP_200_OK)


class AIPerformanceAnalysisAPIView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        results = Result.objects.filter(student=request.user).select_related('exam')
        average = results.aggregate(avg=Avg('percentage'))['avg'] or 0
        weak_subjects = weak_subjects_for_student(request.user)
        proctor_alerts = ProctorLog.objects.filter(student=request.user).count()
        return Response({
            'average_score': round(average, 2),
            'weak_subjects': weak_subjects,
            'proctor_alerts': proctor_alerts,
            'upcoming_exams': upcoming_exams_for_student(request.user),
            'recommendations': [
                'Review weak subjects first',
                'Use AI tutor to generate daily practice questions',
                'Retake the weakest topic quiz every 48 hours',
            ],
        }, status=status.HTTP_200_OK)
