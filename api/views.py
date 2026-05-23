from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsStudent, IsTeacher, can_student_access_exam
from exams.models import Exam
from exams.models import ExamProgress
from proctoring.models import ProctorLog
from results.models import Result
from results.serializers import ResultSerializer

User = get_user_model()


def _month_label(value):
	if not value:
		return None
	try:
		return value.strftime('%b')
	except Exception:
		return str(value)


def _trend_from_results(results_qs):
	trend = (
		results_qs
		.annotate(month=TruncMonth('created_at'))
		.values('month')
		.annotate(score=Avg('percentage'))
		.order_by('month')
	)
	return [{'month': _month_label(item['month']), 'score': round(item['score'] or 0, 2)} for item in trend]


def _severity_for_event(event_type):
	if event_type in ('multiple_faces', 'exam_terminated'):
		return 'high'
	if event_type in ('tab_switch_detected', 'suspicious_movement', 'face_not_centered'):
		return 'medium'
	return 'low'


class StudentDashboardAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		now = timezone.now()
		published = Exam.objects.filter(is_published=True)
		upcoming = published.filter(start_time__gt=now).order_by('start_time')[:10]
		ongoing = published.filter(start_time__lte=now, end_time__gte=now).order_by('end_time')[:10]
		student_results = Result.objects.filter(student=request.user).select_related('exam')
		completed_exam_ids = list(student_results.values_list('exam_id', flat=True))
		completed_exams = Exam.objects.filter(id__in=completed_exam_ids).order_by('-end_time')[:10]

		def _exam_payload(exam, status_override=None):
			status = status_override or ('ongoing' if exam.start_time <= now <= exam.end_time else 'upcoming')
			return {
				'id': exam.id,
				'title': exam.title,
				'description': exam.description,
				'duration_minutes': exam.duration_minutes,
				'start_time': exam.start_time,
				'end_time': exam.end_time,
				'question_count': exam.questions.count(),
				'status': status,
			}

		completed_payload = []
		for result in student_results.order_by('-created_at')[:10]:
			exam = result.exam
			completed_payload.append({
				**_exam_payload(exam, status_override='completed'),
				'score': result.percentage,
				'result_id': result.id,
			})

		return Response({
			'upcoming': [_exam_payload(e, status_override='upcoming') for e in upcoming],
			'ongoing': [_exam_payload(e, status_override='ongoing') for e in ongoing],
			'completed': completed_payload,
			'performance_trend': _trend_from_results(student_results),
		}, status=status.HTTP_200_OK)


class StudentNotificationsAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		now = timezone.now()
		items = []
		for exam in Exam.objects.filter(is_published=True, start_time__gt=now).order_by('start_time')[:3]:
			items.append({
				'id': f'exam-{exam.id}',
				'text': f'New exam scheduled — {exam.title}',
				'time': exam.start_time,
			})
		for result in Result.objects.filter(student=request.user).select_related('exam').order_by('-created_at')[:3]:
			items.append({
				'id': f'result-{result.id}',
				'text': f'Result published — {result.exam.title}',
				'time': result.created_at,
			})
		items = sorted(items, key=lambda x: x['time'], reverse=True)[:10]
		return Response({'notifications': items}, status=status.HTTP_200_OK)


class AdminSummaryAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		now = timezone.now()
		total_users = User.objects.count()
		active_exams = Exam.objects.filter(is_published=True, start_time__lte=now, end_time__gte=now).count()
		recent_alerts = ProctorLog.objects.filter(timestamp__gte=now - timedelta(hours=24)).count()
		trend = _trend_from_results(Result.objects.all())
		return Response({
			'total_users': total_users,
			'active_exams': active_exams,
			'open_alerts': recent_alerts,
			'uptime': 99.99,
			'performance_trend': trend,
		}, status=status.HTTP_200_OK)


class AdminSecurityAlertsAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		logs = ProctorLog.objects.select_related('student', 'exam').order_by('-timestamp')[:20]
		alerts = []
		for log in logs:
			severity = _severity_for_event(log.event_type)
			alerts.append({
				'id': log.id,
				'severity': severity,
				'text': f"{log.event_type.replace('_', ' ').title()} — {log.exam.title}",
				'time': log.timestamp,
			})
		return Response({'alerts': alerts}, status=status.HTTP_200_OK)


class AdminActivityAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		activities = []
		for result in Result.objects.select_related('exam', 'student').order_by('-created_at')[:10]:
			activities.append({
				'id': f'result-{result.id}',
				'type': 'result',
				'message': f"{result.student.username} submitted {result.exam.title}",
				'time': result.created_at,
			})
		for log in ProctorLog.objects.select_related('student', 'exam').order_by('-timestamp')[:10]:
			activities.append({
				'id': f'log-{log.id}',
				'type': 'proctoring',
				'message': f"{log.event_type.replace('_', ' ').title()} — {log.exam.title}",
				'time': log.timestamp,
			})
		activities = sorted(activities, key=lambda x: x['time'], reverse=True)[:20]
		return Response({'activities': activities}, status=status.HTTP_200_OK)


class AdminUsersAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		users = User.objects.all().order_by('-date_joined')
		data = []
		for user in users:
			data.append({
				'id': user.id,
				'name': user.username,
				'email': user.email,
				'role': user.role,
				'joined': user.date_joined,
				'status': 'Active' if user.is_active else 'Inactive',
			})
		return Response({'users': data}, status=status.HTTP_200_OK)


class TeacherSummaryAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		now = timezone.now()
		exams = Exam.objects.filter(created_by=request.user)
		results = Result.objects.filter(exam__in=exams)
		total_students = results.values('student_id').distinct().count()
		active_exams = exams.filter(start_time__lte=now, end_time__gte=now).count()
		live_now = ProctorLog.objects.filter(exam__in=exams, timestamp__gte=now - timedelta(minutes=10)).values('exam_id').distinct().count()
		avg_score = results.aggregate(avg=Avg('percentage'))['avg'] or 0
		return Response({
			'total_students': total_students,
			'active_exams': active_exams,
			'live_now': live_now,
			'avg_score': round(avg_score, 2),
		}, status=status.HTTP_200_OK)


class TeacherMonitorAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		now = timezone.now()
		exams = Exam.objects.filter(created_by=request.user, start_time__lte=now, end_time__gte=now)
		logs = ProctorLog.objects.filter(exam__in=exams).select_related('student', 'exam')
		students = {}
		for log in logs:
			entry = students.setdefault(log.student_id, {
				'id': log.student_id,
				'name': log.student.username,
				'course': log.exam.title,
				'flags': 0,
				'severity': 'ok',
			})
			entry['flags'] += 1
			severity = _severity_for_event(log.event_type)
			if severity == 'high':
				entry['severity'] = 'alert'
			elif severity == 'medium' and entry['severity'] != 'alert':
				entry['severity'] = 'warning'
		data = []
		for item in students.values():
			data.append({
				'id': item['id'],
				'name': item['name'],
				'course': item['course'],
				'status': item['severity'],
				'flags': item['flags'],
			})
		return Response({'students': data}, status=status.HTTP_200_OK)


class TeacherAnalyticsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		exams = Exam.objects.filter(created_by=request.user)
		results = Result.objects.filter(exam__in=exams)
		by_exam = results.values('exam__title').annotate(score=Avg('percentage')).order_by('exam__title')
		data = [{'subject': item['exam__title'], 'score': round(item['score'] or 0, 2)} for item in by_exam]
		return Response({'subject_scores': data}, status=status.HTTP_200_OK)


class TeacherExamsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		exams = Exam.objects.filter(created_by=request.user).order_by('-created_at')
		data = []
		for exam in exams:
			data.append({
				'id': exam.id,
				'title': exam.title,
				'start_time': exam.start_time,
				'end_time': exam.end_time,
				'is_published': exam.is_published,
				'total_marks': exam.total_marks,
				'questions': exam.questions.count(),
			})
		return Response({'exams': data}, status=status.HTTP_200_OK)


class TeacherResultsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		results = (
			Result.objects
			.filter(exam__created_by=request.user)
			.select_related('student', 'exam')
			.order_by('-created_at')
		)
		return Response({'results': ResultSerializer(results, many=True).data}, status=status.HTTP_200_OK)


class TeacherReportsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		now = timezone.now()
		exams = Exam.objects.filter(created_by=request.user)
		results = Result.objects.filter(exam__in=exams)
		pass_count = results.filter(percentage__gte=80).count()
		fail_count = results.count() - pass_count
		avg_score = results.aggregate(avg=Avg('percentage'))['avg'] or 0
		cheating_alerts = ProctorLog.objects.filter(exam__in=exams, timestamp__gte=now - timedelta(days=30)).count()
		return Response({
			'summary': {
				'total_exams': exams.count(),
				'total_students': results.values('student_id').distinct().count(),
				'avg_score': round(avg_score, 2),
				'pass_rate': round((pass_count / (results.count() or 1)) * 100, 2),
				'cheating_alerts': cheating_alerts,
			},
			'pass_fail': {
				'pass': pass_count,
				'fail': fail_count,
			},
			'performance_trend': _trend_from_results(results),
		}, status=status.HTTP_200_OK)


class AdminResultsAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		results = Result.objects.select_related('student', 'exam').order_by('-created_at')
		return Response({'results': ResultSerializer(results, many=True).data}, status=status.HTTP_200_OK)


class AdminProctoringAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		now = timezone.now()
		logs = ProctorLog.objects.select_related('student', 'exam').order_by('-timestamp')[:60]
		streams = {}
		for log in ProctorLog.objects.filter(timestamp__gte=now - timedelta(minutes=30)).select_related('student', 'exam'):
			key = (log.student_id, log.exam_id)
			entry = streams.setdefault(key, {
				'id': f'{log.student_id}-{log.exam_id}',
				'name': log.student.username,
				'exam': log.exam.title,
				'status': 'ok',
				'flags': 0,
			})
			entry['flags'] += 1
			severity = _severity_for_event(log.event_type)
			if severity == 'high':
				entry['status'] = 'alert'
			elif severity == 'medium' and entry['status'] != 'alert':
				entry['status'] = 'warning'

		alerts = []
		for log in logs:
			severity = _severity_for_event(log.event_type)
			alerts.append({
				'id': log.id,
				'severity': severity,
				'text': f"{log.event_type.replace('_', ' ').title()} — {log.exam.title}",
				'time': log.timestamp,
			})

		return Response({
			'streams': list(streams.values()),
			'alerts': alerts,
		}, status=status.HTTP_200_OK)


class AdminReportsAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		now = timezone.now()
		results = Result.objects.select_related('exam')
		security_alerts = ProctorLog.objects.filter(timestamp__gte=now - timedelta(days=30)).count()
		return Response({
			'summary': {
				'total_users': User.objects.count(),
				'total_exams': Exam.objects.count(),
				'total_results': results.count(),
				'security_alerts': security_alerts,
			},
			'performance_trend': _trend_from_results(results),
		}, status=status.HTTP_200_OK)


class SaveExamProgressAPIView(APIView):
	permission_classes = [IsStudent]

	def post(self, request):
		exam_id = request.data.get('exam_id')
		answers = request.data.get('answers', [])
		if not exam_id:
			return Response({'detail': 'exam_id required'}, status=status.HTTP_400_BAD_REQUEST)
		exam = Exam.objects.filter(id=exam_id).first()
		if not exam:
			return Response({'detail': 'exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'exam access denied'}, status=status.HTTP_403_FORBIDDEN)
		obj, _ = ExamProgress.objects.update_or_create(
			student=request.user,
			exam=exam,
			defaults={'answers': answers},
		)
		return Response({'ok': True}, status=status.HTTP_200_OK)

	def get(self, request):
		exam_id = request.query_params.get('exam_id')
		if not exam_id:
			return Response({'detail': 'exam_id required'}, status=status.HTTP_400_BAD_REQUEST)
		exam = Exam.objects.filter(id=exam_id).first()
		if not exam:
			return Response({'detail': 'exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'exam access denied'}, status=status.HTTP_403_FORBIDDEN)
		progress = ExamProgress.objects.filter(student=request.user, exam=exam).first()
		return Response({
			'exam_id': exam.id,
			'answers': progress.answers if progress else [],
			'updated_at': progress.updated_at if progress else None,
		}, status=status.HTTP_200_OK)
