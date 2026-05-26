from django.conf import settings
from django.db import models

from exams.models import Exam


class ProctorLog(models.Model):
	EVENT_CHOICES = (
		('no_face', 'No Face Detected'),
		('multiple_faces', 'Multiple Faces Detected'),
		('face_not_centered', 'Face Not Centered'),
		('suspicious_movement', 'Suspicious Movement'),
		('tab_switch', 'Tab Switch Detected'),
		('fullscreen_exit', 'Fullscreen Exit'),
		('copy_attempt', 'Copy Attempt'),
		('paste_attempt', 'Paste Attempt'),
		('right_click', 'Right Click'),
		('exam_started', 'Exam Started'),
		('exam_submitted', 'Exam Submitted'),
		('exam_terminated', 'Exam Terminated'),
		('suspicious_activity', 'Suspicious Activity'),
	)

	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='proctor_logs')
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='proctor_logs')
	event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
	message = models.TextField(null=True, blank=True)
	timestamp = models.DateTimeField(auto_now_add=True)
	image = models.ImageField(upload_to='proctoring/', null=True, blank=True)

	def __str__(self):
		return f'{self.student} - {self.event_type}'


class StudentExamSession(models.Model):
	STATUS_CHOICES = (
		('ongoing', 'Ongoing'),
		('completed', 'Completed'),
		('terminated', 'Terminated'),
	)

	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_sessions')
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='student_sessions')
	started_at = models.DateTimeField(null=True, blank=True)
	ended_at = models.DateTimeField(null=True, blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ongoing')
	warning_count = models.PositiveIntegerField(default=0)

	class Meta:
		unique_together = ('student', 'exam')

	def __str__(self):
		return f'{self.student} - {self.exam} - {self.status}'
