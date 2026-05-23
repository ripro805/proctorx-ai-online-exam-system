from django.conf import settings
from django.db import models

from exams.models import Exam


class Result(models.Model):
	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='results')
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
	total_questions = models.PositiveIntegerField(default=0)
	correct_answers = models.PositiveIntegerField(default=0)
	score = models.FloatField(default=0)
	percentage = models.FloatField(default=0)
	rank = models.PositiveIntegerField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'{self.student} - {self.exam}'
