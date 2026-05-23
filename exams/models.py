from django.conf import settings
from django.db import models


class Exam(models.Model):
	title = models.CharField(max_length=200)
	description = models.TextField(blank=True)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_exams')
	duration_minutes = models.PositiveIntegerField(default=60)
	start_time = models.DateTimeField()
	end_time = models.DateTimeField()
	is_published = models.BooleanField(default=False)
	total_marks = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return self.title


class ExamEnrollment(models.Model):
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='enrollments')
	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_enrollments')
	created_at = models.DateTimeField(auto_now_add=True)
	active = models.BooleanField(default=True)

	class Meta:
		unique_together = ('exam', 'student')

	def __str__(self):
		return f'{self.student} -> {self.exam}'


class Question(models.Model):
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
	text = models.TextField()
	marks = models.PositiveIntegerField(default=1)

	def __str__(self):
		return f'{self.exam.title}: {self.text[:40]}'


class Choice(models.Model):
	question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
	text = models.CharField(max_length=255)
	is_correct = models.BooleanField(default=False)

	def __str__(self):
		return self.text


class StudentAnswer(models.Model):
	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers')
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='answers')
	question = models.ForeignKey(Question, on_delete=models.CASCADE)
	choice = models.ForeignKey(Choice, on_delete=models.CASCADE)
	is_correct = models.BooleanField(default=False)
	answered_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('student', 'exam', 'question')


class ExamProgress(models.Model):
	student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_progress')
	exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='progress')
	answers = models.JSONField(default=list)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('student', 'exam')
