import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from exams.models import Exam, Question, Choice, ExamEnrollment, StudentAnswer, ExamProgress
from proctoring.models import ProctorLog
from results.models import Result
User = get_user_model()
print('USERS:', User.objects.count())
print('EXAMS:', Exam.objects.count())
print('QUESTIONS:', Question.objects.count())
print('CHOICES:', Choice.objects.count())
print('ENROLLMENTS:', ExamEnrollment.objects.count())
print('ANSWERS:', StudentAnswer.objects.count())
print('PROGRESS:', ExamProgress.objects.count())
print('PROCTORLOG:', ProctorLog.objects.count())
print('RESULTS:', Result.objects.count())
