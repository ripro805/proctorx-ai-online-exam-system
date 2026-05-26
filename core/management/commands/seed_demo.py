from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from exams.models import Exam, Question, Choice, ExamEnrollment
from results.models import Result
from proctoring.models import ProctorLog, StudentExamSession

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo users, exams, questions, results, and proctoring logs'

    def handle(self, *args, **options):
        now = timezone.now()

        def ensure_user(email: str, username: str, role: str, full_name: str):
            user = User.objects.filter(email=email).first() or User.objects.filter(username=username).first()
            if not user:
                user = User.objects.create_user(email=email, username=username, role=role, full_name=full_name, password='demo1234')
            else:
                updated = False
                if user.email != email:
                    user.email = email
                    updated = True
                if not user.username:
                    user.username = username
                    updated = True
                if not user.full_name:
                    user.full_name = full_name
                    updated = True
                if user.role != role:
                    user.role = role
                    updated = True
                if not user.is_active:
                    user.is_active = True
                    updated = True
                user.set_password('demo1234')
                updated = True
                if updated:
                    user.save()
            return user

        admin = ensure_user('admin@demo.com', 'admin', 'admin', 'Admin User')
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        teacher = ensure_user('teacher@demo.com', 'teacher', 'teacher', 'Dr. Sarah Kim')

        students = []
        for idx, name in enumerate(['Alex Johnson', 'Maria Garcia', 'James Chen', 'Priya Patel', 'Omar Hassan', 'Sofia Rossi']):
            email = f'student{idx+1}@demo.com'
            user = ensure_user(email, f'student{idx+1}', 'student', name)
            students.append(user)

        exams = []
        exam_specs = [
            ('Advanced Algorithms', 'Computer Science', now + timedelta(days=3), now + timedelta(days=3, hours=2), True),
            ('Linear Algebra Midterm', 'Mathematics', now - timedelta(hours=1), now + timedelta(hours=1), True),
            ('Quantum Mechanics', 'Physics', now - timedelta(days=7), now - timedelta(days=7, hours=-2), True),
        ]
        for title, subject, start, end, published in exam_specs:
            exam, _ = Exam.objects.get_or_create(
                title=title,
                defaults={
                    'subject': subject,
                    'description': f'{title} — demo exam',
                    'created_by': teacher,
                    'duration_minutes': int((end - start).total_seconds() / 60),
                    'start_time': start,
                    'end_time': end,
                    'is_published': published,
                },
            )
            exams.append(exam)

        for exam in exams:
            if exam.questions.exists():
                continue
            for i in range(1, 6):
                q = Question.objects.create(exam=exam, text=f'Question {i} for {exam.title}', marks=1)
                choices = ['Option A', 'Option B', 'Option C', 'Option D']
                correct_idx = random.randint(0, 3)
                for idx, text in enumerate(choices):
                    Choice.objects.create(question=q, text=text, is_correct=(idx == correct_idx))

        for student in students:
            for exam in exams:
                ExamEnrollment.objects.get_or_create(exam=exam, student=student, defaults={'active': True})

        completed_exam = exams[-1]
        for student in students:
            result, created = Result.objects.get_or_create(
                student=student,
                exam=completed_exam,
                defaults={
                    'total_questions': completed_exam.questions.count(),
                    'correct_answers': random.randint(2, completed_exam.questions.count()),
                    'score': 0,
                    'percentage': 0,
                },
            )
            if created:
                total = result.total_questions or 1
                result.score = result.correct_answers
                result.percentage = round((result.correct_answers / total) * 100, 2)
                result.save()

        # Seed proctor logs for ongoing exam
        ongoing_exam = exams[1]
        for student in students[:3]:
            StudentExamSession.objects.update_or_create(
                student=student,
                exam=ongoing_exam,
                defaults={'status': 'ongoing', 'started_at': now - timedelta(minutes=20)},
            )
            ProctorLog.objects.get_or_create(
                student=student,
                exam=ongoing_exam,
                event_type='tab_switch',
                defaults={'message': 'Tab switch detected'},
            )

        self.stdout.write(self.style.SUCCESS('Seeded demo data (admin/teacher/student accounts, exams, questions, results).'))
