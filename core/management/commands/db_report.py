from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from exams.models import Exam, Question
from ai_tutor.models import AIStudyPlan, AIConversation
from results.models import Result
from proctoring.models import ProctorLog, StudentExamSession

class Command(BaseCommand):
    help = 'Print a brief report of key DB counts and sample records'

    def handle(self, *args, **options):
        User = get_user_model()
        self.stdout.write(f"Users: {User.objects.count()}")
        self.stdout.write(f"Admin exists: {User.objects.filter(email='admin@proctorxai.com').exists()}")
        self.stdout.write(f"Teacher exists: {User.objects.filter(email='teacher@demo.com').exists()}")
        self.stdout.write(f"Student exists: {User.objects.filter(email='rifatrizviofficial001@gmail.com').exists()}")
        self.stdout.write(f"Exams: {Exam.objects.count()}")
        self.stdout.write(f"Questions: {Question.objects.count()}")
        self.stdout.write(f"Results: {Result.objects.count()}")
        self.stdout.write(f"ProctorLogs: {ProctorLog.objects.count()}")
        self.stdout.write(f"Sessions: {StudentExamSession.objects.count()}")
        self.stdout.write(f"AIStudyPlans (student): {AIStudyPlan.objects.filter(student__email='rifatrizviofficial001@gmail.com').count()}")
        self.stdout.write(f"AIConversations (student): {AIConversation.objects.filter(student__email='rifatrizviofficial001@gmail.com').count()}")
        self.stdout.write("\nSample exams created by teacher@demo.com:")
        for e in Exam.objects.filter(created_by__email='teacher@demo.com')[:10]:
            self.stdout.write(f"- {e.title} (id={e.id})")
