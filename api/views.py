from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.utils import timezone
from django.db.models.functions import TruncMonth
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsStudent, IsTeacher, can_student_access_exam
from core.models import SystemSetting
from core.serializers import SystemSettingSerializer
from exams.models import Exam
from exams.models import ExamProgress
from exams.models import StudentAnswer
from proctoring.models import ProctorLog, StudentExamSession
from ai_tutor.utils import has_active_exam_session
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


def _status_for_exam(exam, now):
	if exam.start_time <= now <= exam.end_time:
		return 'ongoing'
	if exam.start_time > now:
		return 'upcoming'
	return 'completed'


def _exam_card_payload(exam, now, status_override=None, score=None):
	status = status_override or _status_for_exam(exam, now)
	return {
		'id': exam.id,
		'title': exam.title,
		'subject': exam.subject or 'General',
		'duration': exam.duration_minutes,
		'questions': exam.questions.count(),
		'date': exam.start_time.date().isoformat() if exam.start_time else None,
		'status': status,
		'score': score,
	}


def _violation_data(logs_qs, now):
	# Build last 7 days counts
	days = []
	for i in range(6, -1, -1):
		day = (now - timedelta(days=i)).date()
		days.append(day)
	counts = {day: 0 for day in days}
	for log in logs_qs:
		day = log.timestamp.date()
		if day in counts:
			counts[day] += 1
	return [
		{'day': day.strftime('%a'), 'count': counts[day]}
		for day in days
	]


def _severity_for_event(event_type):
	if event_type in ('multiple_faces', 'exam_terminated'):
		return 'high'
	if event_type in ('tab_switch', 'suspicious_movement', 'face_not_centered', 'fullscreen_exit', 'no_face'):
		return 'medium'
	return 'low'


class StudentDashboardAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		now = timezone.now()
		published = Exam.objects.filter(is_published=True).order_by('start_time')
		accessible = [e for e in published if can_student_access_exam(request.user, e)]
		upcoming = [e for e in accessible if e.start_time > now][:10]
		ongoing = [e for e in accessible if e.start_time <= now <= e.end_time][:10]
		completed_exams = [e for e in accessible if e.end_time < now][:10]
		student_results = Result.objects.filter(student=request.user).select_related('exam')
		result_map = {r.exam_id: r for r in student_results}

		completed_payload = []
		for exam in completed_exams:
			result = result_map.get(exam.id)
			item = _exam_card_payload(
				exam,
				now,
				status_override='completed',
				score=round(result.percentage or 0, 2) if result else None,
			)
			if result:
				item['result_id'] = result.id
			completed_payload.append(item)

		avg_score = student_results.aggregate(avg=Avg('percentage'))['avg']

		return Response({
			'upcoming': [_exam_card_payload(e, now, status_override='upcoming') for e in upcoming],
			'ongoing': [_exam_card_payload(e, now, status_override='ongoing') for e in ongoing],
			'completed': completed_payload,
			'submitted_completed': student_results.count(),
			'average_score': round(avg_score, 2) if avg_score is not None else None,
			'performance_trend': _trend_from_results(student_results),
		}, status=status.HTTP_200_OK)


class StudentResultsOverviewAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		now = timezone.now()
		results = Result.objects.filter(student=request.user).select_related('exam').order_by('-created_at')
		payload = []
		for result in results:
			exam = result.exam
			answers = StudentAnswer.objects.filter(student=request.user, exam=exam).select_related('question', 'choice').prefetch_related('question__choices').order_by('question_id')
			question_details = []
			for answer in answers:
				question = answer.question
				question_type = getattr(question, 'question_type', '') or 'mcq'
				your_answer = None
				if answer.choice_id and answer.choice:
					your_answer = answer.choice.text
				elif isinstance(answer.answer_data, dict):
					your_answer = answer.answer_data.get('text') or answer.answer_data.get('image') or answer.answer_data.get('choice_text')
				correct_answer = None
				if question_type == 'mcq':
					correct_choice = next((choice for choice in question.choices.all() if choice.is_correct), None)
					correct_answer = correct_choice.text if correct_choice else None
				else:
					correct_answer_data = question.correct_answer_data or {}
					correct_answer = correct_answer_data.get('text') or correct_answer_data.get('image') or correct_answer_data.get('correct_option')
				question_details.append({
					'question_id': question.id,
					'question': question.text,
					'question_type': question_type,
					'your_answer': your_answer,
					'correct_answer': correct_answer,
					'explanation': question.explanation or '',
					'is_correct': bool(answer.is_correct),
					'answer_data': answer.answer_data or {},
				})
			payload.append({
				**_exam_card_payload(exam, now, status_override='completed', score=round(result.percentage or 0, 2)),
				'result_id': result.id,
				'answers': question_details,
			})
		return Response({
			'performance_trend': _trend_from_results(results),
			'results': payload,
		}, status=status.HTTP_200_OK)


class AdminAnalyticsAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		now = timezone.now()
		return Response({
			'performance_trend': _trend_from_results(Result.objects.all()),
			'violation_data': _violation_data(ProctorLog.objects.all(), now),
		}, status=status.HTTP_200_OK)


class StudentExamsAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		now = timezone.now()
		exams = Exam.objects.filter(is_published=True).order_by('start_time')
		results = Result.objects.filter(student=request.user)
		scores = {r.exam_id: round(r.percentage or 0, 2) for r in results}
		data = []
		for exam in exams:
			if not can_student_access_exam(request.user, exam):
				continue
			data.append(_exam_card_payload(exam, now, score=scores.get(exam.id)))
		return Response({'exams': data, 'has_active_session': has_active_exam_session(request.user)}, status=status.HTTP_200_OK)


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
		payload = [
			{
				'id': item['id'],
				'text': item['text'],
				'time': item['time'],
			}
			for item in items
		]
		return Response({'notifications': payload}, status=status.HTTP_200_OK)


class AdminSummaryAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		now = timezone.now()
		total_users = User.objects.count()
		active_exams = Exam.objects.filter(is_published=True, start_time__lte=now, end_time__gte=now).count()
		recent_alerts = ProctorLog.objects.filter(timestamp__gte=now - timedelta(hours=24)).count()
		trend = _trend_from_results(Result.objects.all())
		violation_data = _violation_data(ProctorLog.objects.all(), now)
		return Response({
			'total_users': total_users,
			'active_exams': active_exams,
			'violations': recent_alerts,
			'uptime': 99.99,
			'performance_trend': trend,
			'violation_data': violation_data,
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
				'who': log.student.full_name or log.student.username,
				'what': f"{log.event_type.replace('_', ' ').title()} — {log.exam.title}",
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
				'message': f"{result.student.full_name or result.student.username} submitted {result.exam.title}",
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
				'name': user.full_name or user.username,
				'email': user.email,
				'role': user.role,
				'joined': user.date_joined,
				'status': 'active' if user.is_active else 'inactive',
			})
		return Response({'users': data}, status=status.HTTP_200_OK)


class AdminTeachersAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		teachers = User.objects.filter(role='teacher').order_by('-date_joined')
		data = []
		for teacher in teachers:
			data.append({
				'id': teacher.id,
				'name': teacher.full_name or teacher.username,
				'email': teacher.email,
				'exams_created': teacher.created_exams.count(),
				'status': 'active' if teacher.is_active else 'inactive',
			})
		return Response({'teachers': data}, status=status.HTTP_200_OK)


class TeacherSummaryAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		now = timezone.now()
		exams = Exam.objects.filter(created_by=request.user)
		results = Result.objects.filter(exam__in=exams)
		total_students = results.values('student_id').distinct().count()
		active_exams = exams.filter(start_time__lte=now, end_time__gte=now).count()
		violations = ProctorLog.objects.filter(exam__in=exams, timestamp__gte=now - timedelta(days=7)).count()
		avg_score = results.aggregate(avg=Avg('percentage'))['avg'] or 0
		return Response({
			'total_exams': exams.count(),
			'active_exams': active_exams,
			'students': total_students,
			'violations': violations,
			'avg_score': round(avg_score, 2),
			'performance_trend': _trend_from_results(results),
			'violation_data': _violation_data(ProctorLog.objects.filter(exam__in=exams), now),
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
				'name': log.student.full_name or log.student.username,
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
		return Response({'subject_scores': data, 'performance_trend': _trend_from_results(results)}, status=status.HTTP_200_OK)


class TeacherExamsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		exams = Exam.objects.filter(created_by=request.user).order_by('-created_at')
		data = []
		for exam in exams:
			data.append({
				'id': exam.id,
				'title': exam.title,
				'subject': exam.subject or 'General',
				'start_time': exam.start_time,
				'end_time': exam.end_time,
				'is_published': exam.is_published,
				'total_marks': exam.total_marks,
				'questions': exam.questions.count(),
			})
		return Response({'exams': data}, status=status.HTTP_200_OK)


class TeacherStudentsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		results = Result.objects.filter(exam__created_by=request.user).select_related('student')
		data = {}
		for item in results:
			entry = data.setdefault(item.student_id, {
				'id': item.student_id,
				'name': item.student.full_name or item.student.username,
				'email': item.student.email,
				'status': 'active' if item.student.is_active else 'inactive',
				'avg_score': [],
			})
			entry['avg_score'].append(item.percentage or 0)
		payload = []
		for entry in data.values():
			avg = round(sum(entry['avg_score']) / max(1, len(entry['avg_score'])), 2)
			payload.append({
				'id': entry['id'],
				'name': entry['name'],
				'email': entry['email'],
				'status': entry['status'],
				'avg_score': avg,
			})
		return Response({'students': payload}, status=status.HTTP_200_OK)


class TeacherResultsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		results = (
			Result.objects
			.filter(exam__created_by=request.user)
			.select_related('student', 'exam')
			.order_by('-created_at')
		)
		payload = []
		for item in results:
			warnings = StudentExamSession.objects.filter(student=item.student, exam=item.exam).values_list('warning_count', flat=True).first() or 0
			integrity = max(0, 100 - (warnings * 5))
			data = ResultSerializer(item).data
			data['integrity'] = integrity
			payload.append(data)
		return Response({'results': payload}, status=status.HTTP_200_OK)


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
		distribution = [
			{'name': 'A (90+)', 'value': results.filter(percentage__gte=90).count()},
			{'name': 'B (80–89)', 'value': results.filter(percentage__gte=80, percentage__lt=90).count()},
			{'name': 'C (70–79)', 'value': results.filter(percentage__gte=70, percentage__lt=80).count()},
			{'name': 'D (60–69)', 'value': results.filter(percentage__gte=60, percentage__lt=70).count()},
			{'name': 'F (<60)', 'value': results.filter(percentage__lt=60).count()},
		]
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
			'distribution': distribution,
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
				'name': log.student.full_name or log.student.username,
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


class SystemSettingsAPIView(APIView):
	permission_classes = [IsAdmin]

	def get(self, request):
		settings_obj, _ = SystemSetting.objects.get_or_create(id=1)
		return Response(SystemSettingSerializer(settings_obj).data, status=status.HTTP_200_OK)

	def put(self, request):
		settings_obj, _ = SystemSetting.objects.get_or_create(id=1)
		serializer = SystemSettingSerializer(settings_obj, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)


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
