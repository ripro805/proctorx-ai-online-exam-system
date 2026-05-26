from django.conf import settings
from django.db import models


class AIConversation(models.Model):
    MODE_CHOICES = (
        ('chat', 'Chat'),
        ('voice', 'Voice'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_conversations')
    title = models.CharField(max_length=255, blank=True)
    subject = models.CharField(max_length=120, blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='chat')
    metadata = models.JSONField(default=dict, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f'AI chat #{self.pk}'


class AIMessage(models.Model):
    ROLE_CHOICES = (
        ('system', 'System'),
        ('user', 'User'),
        ('assistant', 'Assistant'),
    )

    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    provider = models.CharField(max_length=40, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'{self.conversation_id}:{self.role}'


class AIStudyPlan(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_study_plans')
    subject = models.CharField(max_length=120, blank=True)
    exam = models.ForeignKey('exams.Exam', on_delete=models.SET_NULL, null=True, blank=True, related_name='ai_study_plans')
    plan_data = models.JSONField(default=dict, blank=True)
    progress_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.student_id} - {self.subject or "Study plan"}'


class AIQuiz(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_quizzes')
    topic = models.CharField(max_length=120, blank=True)
    difficulty = models.CharField(max_length=40, blank=True)
    quiz_data = models.JSONField(default=dict, blank=True)
    provider = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.student_id} - {self.topic or "quiz"}'
