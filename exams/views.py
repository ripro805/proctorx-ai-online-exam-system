from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsStudent, IsTeacher, can_student_access_exam
from exams.models import Choice, Exam, Question, StudentAnswer
from proctoring.models import StudentExamSession
from exams.serializers import (
	ChoiceSerializer,
	ExamSerializer,
	QuestionSerializer,
	StudentExamSerializer,
)
from results.models import Result


class ExamViewSet(viewsets.ModelViewSet):
	serializer_class = ExamSerializer

	def get_queryset(self):
		user = self.request.user
		if user.role == 'teacher' or user.role == 'admin':
			return Exam.objects.all()
		return Exam.objects.filter(is_published=True)

	def perform_create(self, serializer):
		serializer.save(created_by=self.request.user)

	def get_serializer_class(self):
		user = self.request.user
		if user.is_authenticated and user.role == 'student' and self.action in ('list', 'retrieve'):
			return StudentExamSerializer
		return ExamSerializer

	def get_permissions(self):
		if self.action in ('create', 'update', 'partial_update', 'destroy'):
			return [IsTeacher()]
		return [permissions.IsAuthenticated()]


class QuestionViewSet(viewsets.ModelViewSet):
	queryset = Question.objects.all()
	serializer_class = QuestionSerializer
	permission_classes = [IsTeacher]


class ChoiceViewSet(viewsets.ModelViewSet):
	queryset = Choice.objects.all()
	serializer_class = ChoiceSerializer
	permission_classes = [IsTeacher]


class ExamStartAPIView(APIView):
	permission_classes = [IsStudent]

	def post(self, request):
		exam_id = request.data.get('exam_id')
		exam = Exam.objects.filter(id=exam_id, is_published=True).first()
		if not exam:
			return Response({'detail': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'Exam access denied'}, status=status.HTTP_403_FORBIDDEN)

		now = timezone.now()
		if not (exam.start_time <= now <= exam.end_time):
			return Response({'detail': 'Exam is not active'}, status=status.HTTP_400_BAD_REQUEST)

		StudentExamSession.objects.update_or_create(
			student=request.user,
			exam=exam,
			defaults={'started_at': now, 'status': 'ongoing'},
		)

		remaining_seconds = int((exam.end_time - now).total_seconds())
		return Response({'exam_id': exam.id, 'remaining_seconds': remaining_seconds, 'server_time': now})


class ExamSubmitAPIView(APIView):
	permission_classes = [IsStudent]

	def post(self, request):
		exam_id = request.data.get('exam_id')
		answers = request.data.get('answers', [])
		exam = Exam.objects.filter(id=exam_id, is_published=True).first()
		if not exam:
			return Response({'detail': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'Exam access denied'}, status=status.HTTP_403_FORBIDDEN)

		now = timezone.now()
		if now > exam.end_time:
			return Response({'detail': 'Exam time expired'}, status=status.HTTP_400_BAD_REQUEST)

		if Result.objects.filter(exam=exam, student=request.user).exists():
			return Response({'detail': 'Exam already submitted'}, status=status.HTTP_400_BAD_REQUEST)

		with transaction.atomic():
			correct = 0
			total = exam.questions.count()

			for item in answers:
				question_id = item.get('question_id')
				choice_id = item.get('choice_id')
				question = Question.objects.filter(id=question_id, exam=exam).first()
				choice = Choice.objects.filter(id=choice_id, question=question).first()
				if not question or not choice:
					continue
				is_correct = choice.is_correct
				StudentAnswer.objects.update_or_create(
					student=request.user,
					exam=exam,
					question=question,
					defaults={'choice': choice, 'is_correct': is_correct},
				)
				if is_correct:
					correct += question.marks

			total_marks = sum(q.marks for q in exam.questions.all()) or 1
			percentage = (correct / total_marks) * 100

			result = Result.objects.create(
				student=request.user,
				exam=exam,
				total_questions=total,
				correct_answers=correct,
				score=correct,
				percentage=percentage,
			)

			ranked = Result.objects.filter(exam=exam).order_by('-score', 'created_at')
			for index, item in enumerate(ranked, start=1):
				if item.rank != index:
					item.rank = index
					item.save(update_fields=['rank'])

		StudentExamSession.objects.update_or_create(
			student=request.user,
			exam=exam,
			defaults={'status': 'completed', 'ended_at': now},
		)

		return Response({'result_id': result.id, 'score': correct, 'percentage': percentage})
