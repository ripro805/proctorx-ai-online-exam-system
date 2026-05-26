from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions, status, viewsets
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsStudent, IsTeacher, can_student_access_exam
from exams.models import Exam
from proctoring.models import ProctorLog, StudentExamSession
from proctoring.serializers import ProctorLogSerializer, StudentExamSessionSerializer
from proctoring import ai_engine, services


def _broadcast_exam_event(exam_id, event_type, message, payload=None):
	channel_layer = get_channel_layer()
	async_to_sync(channel_layer.group_send)(
		f'exam_{exam_id}',
		{
			'type': 'broadcast_message',
			'message': {
				'event': event_type,
				'message': message,
				'payload': payload or {},
			},
		},
	)


def _broadcast_global_event(event_type, message, payload=None):
	channel_layer = get_channel_layer()
	async_to_sync(channel_layer.group_send)(
		'proctoring_global',
		{
			'type': 'broadcast_message',
			'message': {
				'event': event_type,
				'message': message,
				'payload': payload or {},
			},
		},
	)


class ProctorLogViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = ProctorLogSerializer
	permission_classes = [IsTeacher]

	def get_queryset(self):
		return ProctorLog.objects.select_related('student', 'exam')


class ProctorLogCreateAPIView(APIView):
	permission_classes = [IsStudent]

	def post(self, request):
		data = request.data
		exam_id = data.get('exam') or data.get('exam_id')
		if not exam_id:
			return Response({'detail': 'exam required'}, status=status.HTTP_400_BAD_REQUEST)
		exam = Exam.objects.filter(id=exam_id).first()
		if not exam:
			return Response({'detail': 'exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'exam access denied'}, status=status.HTTP_403_FORBIDDEN)
		event_type = data.get('event_type')
		message = data.get('message')
		log = services.log_proctor_event(request.user, exam, event_type, message=message)
		payload = {
			'id': log.id,
			'exam_id': log.exam_id,
			'student_id': request.user.id,
			'student_name': request.user.full_name or request.user.username,
			'event_type': log.event_type,
			'message': log.message,
			'timestamp': log.timestamp.isoformat(),
		}
		_broadcast_exam_event(log.exam_id, log.event_type, 'Proctoring event logged', payload=payload)
		_broadcast_global_event(log.event_type, 'Proctoring event logged', payload=payload)
		return Response(ProctorLogSerializer(log).data, status=status.HTTP_201_CREATED)


class StudentProctorLogAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		logs = ProctorLog.objects.filter(student=request.user).order_by('-timestamp')[:100]
		return Response(ProctorLogSerializer(logs, many=True).data)


class ProctorFrameAPIView(APIView):
	"""Accepts base64 frames (preferred) or raw bytes and runs AI checks.

	POST payload example:
	{
		"exam": 1,
		"frame": "data:image/jpeg;base64,/9j/..."
	}
	"""
	permission_classes = [IsStudent]

	def post(self, request):
		exam_id = request.data.get('exam')
		frame_b64 = request.data.get('frame')
		if not exam_id or not frame_b64:
			return Response({'detail': 'exam and frame required'}, status=status.HTTP_400_BAD_REQUEST)
		exam = Exam.objects.filter(id=exam_id).first()
		if not exam:
			return Response({'detail': 'exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'exam access denied'}, status=status.HTTP_403_FORBIDDEN)

		analysis = ai_engine.analyze_frame(frame_b64)
		events_created = []

		# create ProctorLog if there is a warning
		if analysis.get('warning') in ('no_face', 'multiple_faces'):
			log = services.log_proctor_event(
				request.user,
				exam,
				analysis['warning'],
				message=analysis.get('warning'),
				image_bytes=analysis.get('image_bytes'),
			)
			events_created.append(log.event_type)
			payload = {
				'id': log.id,
				'exam_id': log.exam_id,
				'student_id': request.user.id,
				'student_name': request.user.full_name or request.user.username,
				'event_type': log.event_type,
				'message': log.message,
				'timestamp': log.timestamp.isoformat(),
			}
			_broadcast_exam_event(exam_id, log.event_type, 'Proctoring warning', payload=payload)
			_broadcast_global_event(log.event_type, 'Proctoring warning', payload=payload)

		# Broadcast latest frame for live monitoring
		frame_payload = {
			'exam_id': exam_id,
			'student_id': request.user.id,
			'student_name': request.user.full_name or request.user.username,
			'frame': frame_b64,
			'timestamp': timezone.now().isoformat(),
		}
		_broadcast_exam_event(exam_id, 'frame', 'Live frame', payload=frame_payload)
		_broadcast_global_event('frame', 'Live frame', payload=frame_payload)

		return Response({
			'face_detected': analysis.get('face_detected', False),
			'multiple_faces': analysis.get('multiple_faces', False),
			'warning': analysis.get('warning'),
			'boxes': analysis.get('boxes', []),
			'events': events_created,
		})


class GenericEventAPIView(APIView):
	permission_classes = [IsStudent]

	def _handle(self, request, event_type):
		exam_id = request.data.get('exam')
		if not exam_id:
			return Response({'detail': 'exam required'}, status=status.HTTP_400_BAD_REQUEST)
		exam = Exam.objects.filter(id=exam_id).first()
		if not exam:
			return Response({'detail': 'exam not found'}, status=status.HTTP_404_NOT_FOUND)
		if not can_student_access_exam(request.user, exam):
			return Response({'detail': 'exam access denied'}, status=status.HTTP_403_FORBIDDEN)
		log = services.log_proctor_event(request.user, exam, event_type, message=event_type)
		_broadcast_exam_event(exam_id, event_type, 'Proctoring event', payload={'student': request.user.id})
		return Response(ProctorLogSerializer(log).data, status=status.HTTP_201_CREATED)

	def post(self, request, *args, **kwargs):
		# dispatch based on URL; subclasses will call _handle
		return Response({'detail': 'use specific endpoints'}, status=status.HTTP_400_BAD_REQUEST)


class TabSwitchAPIView(GenericEventAPIView):
	def post(self, request):
		return self._handle(request, 'tab_switch')


class FullscreenExitAPIView(GenericEventAPIView):
	def post(self, request):
		return self._handle(request, 'fullscreen_exit')


class CopyAttemptAPIView(GenericEventAPIView):
	def post(self, request):
		return self._handle(request, 'copy_attempt')


class RightClickAPIView(GenericEventAPIView):
	def post(self, request):
		return self._handle(request, 'right_click')


class TeacherMonitoringSessionsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		exam_id = request.query_params.get('exam_id')
		qs = StudentExamSession.objects.select_related('student', 'exam')
		if exam_id:
			qs = qs.filter(exam_id=exam_id)
		else:
			qs = qs.filter(exam__created_by=request.user)
		data = StudentExamSessionSerializer(qs.order_by('-started_at', '-id'), many=True).data
		return Response({'sessions': data}, status=status.HTTP_200_OK)


class TeacherActiveStudentsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		exam_id = request.query_params.get('exam_id')
		qs = StudentExamSession.objects.select_related('student', 'exam').filter(status='ongoing')
		if exam_id:
			qs = qs.filter(exam_id=exam_id)
		else:
			qs = qs.filter(exam__created_by=request.user)
		latest_logs = ProctorLog.objects.filter(exam__in=qs.values_list('exam_id', flat=True)).order_by('-timestamp')
		latest_by_student = {}
		for log in latest_logs:
			latest_by_student.setdefault(log.student_id, log)
		data = []
		for session in qs.order_by('-started_at', '-id'):
			last_log = latest_by_student.get(session.student_id)
			data.append({
				'id': session.id,
				'student_id': session.student_id,
				'student_name': session.student.username,
				'exam_id': session.exam_id,
				'exam_title': session.exam.title,
				'status': session.status,
				'warning_count': session.warning_count,
				'last_event_type': last_log.event_type if last_log else None,
				'last_event_time': last_log.timestamp if last_log else None,
			})
		return Response({'active_students': data}, status=status.HTTP_200_OK)
