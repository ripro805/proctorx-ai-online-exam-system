from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from ai_tutor.models import AIConversation, AIQuiz, AIStudyPlan
from exams.models import Choice, Exam, ExamEnrollment, ExamProgress, Question, StudentAnswer
from proctoring.models import ProctorLog, StudentExamSession
from results.models import Result


def _count_orphans(child_table: str, child_column: str, parent_table: str) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM {child_table} child
            LEFT JOIN {parent_table} parent
                ON child.{child_column} = parent.id
            WHERE child.{child_column} IS NOT NULL
              AND parent.id IS NULL
            """
        )
        row = cursor.fetchone()
    return int(row[0] or 0)


class Command(BaseCommand):
    help = 'Validate that the Neon migration preserved the core dashboard data and foreign keys.'

    def add_arguments(self, parser):
        parser.add_argument('--strict', action='store_true', help='Fail if any critical count or FK check is missing.')
        parser.add_argument('--student-email', default='rifatrizviofficial001@gmail.com', help='Student account to validate.')
        parser.add_argument('--teacher-email', default='teacher@demo.com', help='Teacher account to validate.')
        parser.add_argument('--admin-email', default='admin@proctorxai.com', help='Admin account to validate.')

    def handle(self, *args, **options):
        User = get_user_model()
        strict = options['strict']
        student_email = options['student_email']
        teacher_email = options['teacher_email']
        admin_email = options['admin_email']

        target_users = {
            'admin': User.objects.filter(email=admin_email).first(),
            'teacher': User.objects.filter(email=teacher_email).first(),
            'student': User.objects.filter(email=student_email).first(),
        }

        summary = {
            'users': User.objects.count(),
            'exams': Exam.objects.count(),
            'questions': Question.objects.count(),
            'choices': Choice.objects.count(),
            'enrollments': ExamEnrollment.objects.count(),
            'results': Result.objects.count(),
            'exam_progress': ExamProgress.objects.count(),
            'student_answers': StudentAnswer.objects.count(),
            'proctor_logs': ProctorLog.objects.count(),
            'sessions': StudentExamSession.objects.count(),
            'ai_conversations': AIConversation.objects.count(),
            'ai_study_plans': AIStudyPlan.objects.count(),
            'ai_quizzes': AIQuiz.objects.count(),
        }

        self.stdout.write('Core counts:')
        for key, value in summary.items():
            self.stdout.write(f'  - {key}: {value}')

        dashboard_checks = {
            'student_enrollments': ExamEnrollment.objects.filter(student__email=student_email).count(),
            'student_results': Result.objects.filter(student__email=student_email).count(),
            'student_ai_history': AIConversation.objects.filter(student__email=student_email).count(),
            'student_study_plans': AIStudyPlan.objects.filter(student__email=student_email).count(),
            'student_quizzes': AIQuiz.objects.filter(student__email=student_email).count(),
            'teacher_exams': Exam.objects.filter(created_by__email=teacher_email).count(),
            'admin_analytics_rows': Result.objects.count() + ProctorLog.objects.count(),
        }

        self.stdout.write('\nDashboard-relevant counts:')
        for key, value in dashboard_checks.items():
            self.stdout.write(f'  - {key}: {value}')

        for label, user in target_users.items():
            if user:
                self.stdout.write(f"{label.title()} account: {user.email} role={user.role}")
            elif strict:
                raise CommandError(f'Missing required {label} account: {locals()[f"{label}_email"]}')

        orphan_checks = {
            'exam_enrollment_student': _count_orphans(ExamEnrollment._meta.db_table, 'student_id', User._meta.db_table),
            'exam_enrollment_exam': _count_orphans(ExamEnrollment._meta.db_table, 'exam_id', Exam._meta.db_table),
            'result_student': _count_orphans(Result._meta.db_table, 'student_id', User._meta.db_table),
            'result_exam': _count_orphans(Result._meta.db_table, 'exam_id', Exam._meta.db_table),
            'question_exam': _count_orphans(Question._meta.db_table, 'exam_id', Exam._meta.db_table),
            'choice_question': _count_orphans(Choice._meta.db_table, 'question_id', Question._meta.db_table),
            'student_answer_student': _count_orphans(StudentAnswer._meta.db_table, 'student_id', User._meta.db_table),
            'student_answer_exam': _count_orphans(StudentAnswer._meta.db_table, 'exam_id', Exam._meta.db_table),
            'student_answer_question': _count_orphans(StudentAnswer._meta.db_table, 'question_id', Question._meta.db_table),
            'student_answer_choice': _count_orphans(StudentAnswer._meta.db_table, 'choice_id', Choice._meta.db_table),
            'exam_progress_student': _count_orphans(ExamProgress._meta.db_table, 'student_id', User._meta.db_table),
            'exam_progress_exam': _count_orphans(ExamProgress._meta.db_table, 'exam_id', Exam._meta.db_table),
            'session_student': _count_orphans(StudentExamSession._meta.db_table, 'student_id', User._meta.db_table),
            'session_exam': _count_orphans(StudentExamSession._meta.db_table, 'exam_id', Exam._meta.db_table),
            'proctor_log_student': _count_orphans(ProctorLog._meta.db_table, 'student_id', User._meta.db_table),
            'proctor_log_exam': _count_orphans(ProctorLog._meta.db_table, 'exam_id', Exam._meta.db_table),
            'ai_conversation_student': _count_orphans(AIConversation._meta.db_table, 'student_id', User._meta.db_table),
            'ai_study_plan_student': _count_orphans(AIStudyPlan._meta.db_table, 'student_id', User._meta.db_table),
            'ai_study_plan_exam': _count_orphans(AIStudyPlan._meta.db_table, 'exam_id', Exam._meta.db_table),
            'ai_quiz_student': _count_orphans(AIQuiz._meta.db_table, 'student_id', User._meta.db_table),
        }

        self.stdout.write('\nForeign-key checks:')
        failures = []
        for key, value in orphan_checks.items():
            self.stdout.write(f'  - {key}: {value}')
            if value:
                failures.append(f'{key} has {value} orphaned rows')

        required_checks = [
            ('users', summary['users'] > 0),
            ('exams', summary['exams'] > 0),
            ('results', summary['results'] > 0),
            ('proctor_logs', summary['proctor_logs'] > 0),
            ('student_enrollments', dashboard_checks['student_enrollments'] > 0),
            ('student_results', dashboard_checks['student_results'] > 0),
            ('teacher_exams', dashboard_checks['teacher_exams'] > 0),
            ('student_ai_history', dashboard_checks['student_ai_history'] > 0),
        ]

        if strict:
            for label, ok in required_checks:
                if not ok:
                    failures.append(f'Missing required data: {label}')
            if failures:
                raise CommandError('; '.join(failures))

        if failures:
            self.stdout.write(self.style.WARNING('\nValidation completed with warnings:'))
            for failure in failures:
                self.stdout.write(self.style.WARNING(f'  - {failure}'))
        else:
            self.stdout.write(self.style.SUCCESS('\nValidation passed — dashboard data and relations look healthy.'))
