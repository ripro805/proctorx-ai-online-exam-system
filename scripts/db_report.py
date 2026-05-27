import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proctor_ai.settings')
django.setup()
from django.contrib.auth import get_user_model
from exams.models import Exam, Question
from ai_tutor.models import AIStudyPlan, AIConversation
from results.models import Result
from proctoring.models import ProctorLog, StudentExamSession
User = get_user_model()
print('Users:', User.objects.count())
print('Admin:', User.objects.filter(email='admin@proctorxai.com').exists())
print('Teacher:', User.objects.filter(email='teacher@demo.com').exists())
print('Student:', User.objects.filter(email='rifatrizviofficial001@gmail.com').exists())
print('Exams:', Exam.objects.count())
print('Questions:', Question.objects.count())
print('Results:', Result.objects.count())
print('ProctorLogs:', ProctorLog.objects.count())
print('Sessions:', StudentExamSession.objects.count())
print('AIStudyPlans (student):', AIStudyPlan.objects.filter(student__email='rifatrizviofficial001@gmail.com').count())
print('AIConversations (student):', AIConversation.objects.filter(student__email='rifatrizviofficial001@gmail.com').count())
print('\nSample exams created by teacher@demo.com:')
for e in Exam.objects.filter(created_by__email='teacher@demo.com')[:10]:
    print('-', e.title, 'id=', e.id)
