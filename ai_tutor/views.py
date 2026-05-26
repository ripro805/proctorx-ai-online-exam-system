from __future__ import annotations

from django.db.models import Avg
from django.db.models import Count
from django.utils import timezone
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
from core.permissions import IsTeacher
from django.utils import timezone
from django.db.models import Count
from exams.models import Exam
from proctoring.models import ProctorLog
from results.models import Result


def _guard_student_ai(request):
    if has_active_exam_session(request.user):
        return Response({'detail': active_exam_block_message()}, status=status.HTTP_403_FORBIDDEN)
    return None


def _build_study_plan_context(request, subject: str, exam_id=None):
    exam = None
    if exam_id:
        exam = Exam.objects.filter(id=exam_id, is_published=True).first()
    if not exam:
        exam = Exam.objects.filter(is_published=True).order_by('start_time').first()

    weak_subjects = weak_subjects_for_student(request.user)
    recent_results = list(
        Result.objects.filter(student=request.user)
        .select_related('exam')
        .order_by('-created_at')
        .values('exam__title', 'exam__subject', 'percentage', 'created_at')[:5]
    )
    recent_warnings = list(
        ProctorLog.objects.filter(student=request.user)
        .order_by('-timestamp')
        .values('event_type', 'timestamp', 'message')[:5]
    )
    upcoming = upcoming_exams_for_student(request.user)
    average_score = Result.objects.filter(student=request.user).aggregate(avg=Avg('percentage'))['avg'] or 0
    completed_topics = request.data.get('completed_topics') or request.data.get('completedTopics') or ''
    completed_topics_list = [item.strip() for item in str(completed_topics).replace('\n', ',').split(',') if item.strip()]

    return {
        'student_name': getattr(request.user, 'name', '') or request.user.email.split('@')[0],
        'subject': subject,
        'selected_exam': {
            'id': exam.id if exam else None,
            'title': exam.title if exam else None,
            'subject': exam.subject if exam else subject,
            'date': exam.start_time.date().isoformat() if exam and exam.start_time else None,
            'start_time': exam.start_time.isoformat() if exam and exam.start_time else None,
            'end_time': exam.end_time.isoformat() if exam and exam.end_time else None,
            'duration_minutes': exam.duration_minutes if exam else None,
            'total_marks': exam.total_marks if exam else None,
        },
        'study_hours_per_day': request.data.get('study_hours_per_day') or request.data.get('study_hours') or 3,
        'difficulty_level': request.data.get('difficulty_level') or request.data.get('difficulty') or 'balanced',
        'learning_pace': request.data.get('learning_pace') or 'steady',
        'completed_topics': completed_topics_list,
        'performance_snapshot': {
            'average_score': round(average_score, 2),
            'weak_subjects': weak_subjects,
            'recent_results': recent_results,
            'recent_warnings': recent_warnings,
            'upcoming_exams': upcoming,
        },
    }


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
        # route_chat returns an object with attributes (.content, .provider, .fallback)
        provider_val = response.provider if hasattr(response, 'provider') else (response.get('provider') if isinstance(response, dict) else '')
        AIMessage.objects.create(conversation=conversation, role='assistant', content=reply_text, provider=provider_val)
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
        context = _build_study_plan_context(request, subject, exam_id)
        exam = Exam.objects.filter(id=context['selected_exam']['id']).first() if context['selected_exam']['id'] else None
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
        count = int(request.data.get('question_count') or request.data.get('count') or 5)
        quiz_data = generate_quiz(topic, difficulty, count, {
            'weak_subjects': weak_subjects_for_student(request.user),
        })
        # Persist full quiz (includes correct answers & explanations) securely in backend
        quiz = AIQuiz.objects.create(student=request.user, topic=topic, difficulty=difficulty, quiz_data=quiz_data, provider=quiz_data.get('provider', 'fallback'))

        # Build public payload without revealing correct answers or explanations
        public_quiz = {
            'quiz_id': quiz.id,
            'quiz_title': quiz_data.get('quiz_title') or f'{topic} quiz',
            'questions': [],
        }
        for q in quiz_data.get('questions', []) if isinstance(quiz_data.get('questions'), list) else []:
            # Accept several possible key names for options/question
            question_text = q.get('question') or q.get('prompt') or ''
            options = q.get('options') or q.get('choices') or {}
            # Normalize options to map 'A','B','C','D'
            normalized = {}
            if isinstance(options, dict):
                for k, v in options.items():
                    normalized[str(k)] = v
            elif isinstance(options, list):
                # convert list to A,B,C... keys
                for idx, val in enumerate(options):
                    key = chr(ord('A') + idx)
                    normalized[key] = val
            else:
                normalized = {}

            public_quiz['questions'].append({'question': question_text, 'options': normalized})

        return Response({'quiz': public_quiz}, status=status.HTTP_200_OK)


class AIQuizSubmitAPIView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        blocked = _guard_student_ai(request)
        if blocked:
            return blocked
        quiz_id = request.data.get('quiz_id')
        answers = request.data.get('answers') or {}
        if not quiz_id:
            return Response({'detail': 'quiz_id required'}, status=status.HTTP_400_BAD_REQUEST)
        quiz = AIQuiz.objects.filter(id=quiz_id, student=request.user).first()
        if not quiz:
            return Response({'detail': 'quiz not found'}, status=status.HTTP_404_NOT_FOUND)

        full = quiz.quiz_data or {}
        questions = full.get('questions') or []
        total = len(questions)
        correct_count = 0
        correct_answers_detail = []
        # Determine correct option key in each question
        for idx, q in enumerate(questions, start=1):
            qtext = q.get('question') or q.get('prompt') or ''
            # possible names for correct answer
            corr = q.get('correct_option') or q.get('correct_answer') or q.get('answer') or q.get('correct')
            explanation = q.get('explanation') or q.get('explain') or ''
            your = answers.get(str(idx)) or answers.get(idx) or answers.get(str(idx)) or None
            is_correct = False
            if your is not None and corr is not None:
                # Normalize single-letter answers
                your_norm = str(your).strip()
                corr_norm = str(corr).strip()
                if your_norm.upper() == corr_norm.upper():
                    is_correct = True
            if is_correct:
                correct_count += 1
            correct_answers_detail.append({
                'question': qtext,
                'your_answer': your,
                'correct_answer': corr,
                'explanation': explanation,
            })

        percentage = round((correct_count / total) * 100, 2) if total else 0

        # Very simple performance analysis heuristic
        performance_analysis = {
            'strength': full.get('topic') or quiz.topic,
            'weakness': 'Review incorrect topics',
        }

        return Response({
            'score': correct_count,
            'total': total,
            'percentage': percentage,
            'correct_answers': correct_answers_detail,
            'performance_analysis': performance_analysis,
        }, status=status.HTTP_200_OK)


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


class TeacherAIAnalyticsAPIView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        # Basic AI usage analytics for educators
        now = timezone.now()
        last_30 = now - timezone.timedelta(days=30)
        total_conversations = AIConversation.objects.count()
        conversations_30d = AIConversation.objects.filter(created_at__gte=last_30).count()
        total_messages = AIMessage.objects.count()
        avg_messages_per_conversation = round((total_messages / total_conversations) if total_conversations else 0, 2)

        top_subjects = list(
            AIConversation.objects.values('subject')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        provider_usage = list(
            AIMessage.objects.values('provider')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        recent_activity = list(
            AIConversation.objects.select_related('student')
            .order_by('-updated_at')[:20]
            .values('id', 'title', 'subject', 'student__id', 'student__name', 'updated_at')
        )

        return Response(
            {
                'total_conversations': total_conversations,
                'conversations_last_30_days': conversations_30d,
                'total_messages': total_messages,
                'avg_messages_per_conversation': avg_messages_per_conversation,
                'top_subjects': top_subjects,
                'provider_usage': provider_usage,
                'recent_activity': recent_activity,
            },
            status=status.HTTP_200_OK,
        )
