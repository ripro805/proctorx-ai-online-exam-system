from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from ai_tutor.models import AIConversation, AIQuiz, AIStudyPlan
from exams.models import Exam, ExamEnrollment, ExamProgress, StudentAnswer
from proctoring.models import ProctorLog, StudentExamSession
from results.models import Result


class Command(BaseCommand):
    help = 'Rebind legacy demo teacher data (e.g. Dr. Sarah Kim) to a real teacher account.'

    def add_arguments(self, parser):
        parser.add_argument('--source-email', dest='source_email', default='', help='Legacy demo teacher email to transfer from (optional)')
        parser.add_argument('--source-name', dest='source_name', default='Dr. Sarah Kim', help='Legacy demo teacher full name to transfer from')
        parser.add_argument('--target-email', dest='target_email', required=True, help='Real teacher email to transfer to')
        parser.add_argument('--target-name', dest='target_name', default='Teacher', help='Display name for the real teacher account')
        parser.add_argument('--target-password', dest='target_password', default='Prova@123', help='Password to set on the target teacher account')
        parser.add_argument('--delete-source', action='store_true', dest='delete_source', help='Delete the legacy source user after transfer')

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        target_email = options['target_email']
        target_name = options['target_name']
        target_password = options['target_password']
        source_email = options['source_email'].strip()
        source_name = options['source_name'].strip()
        delete_source = options['delete_source']

        target = User.objects.filter(email=target_email).first()
        if not target:
            target = User.objects.create_user(
                email=target_email,
                username=target_email.split('@')[0],
                role='teacher',
                full_name=target_name,
                password=target_password,
            )
            target.is_active = True
            target.save()
            self.stdout.write(self.style.WARNING(f'Created target teacher account: {target_email}'))
        else:
            changed = False
            if target.role != 'teacher':
                target.role = 'teacher'
                changed = True
            if target.full_name != target_name:
                target.full_name = target_name
                changed = True
            if not target.username:
                target.username = target_email.split('@')[0]
                changed = True
            if not target.check_password(target_password):
                target.set_password(target_password)
                changed = True
            if not target.is_active:
                target.is_active = True
                changed = True
            if changed:
                target.save()

        source_qs = User.objects.none()
        if source_email:
            source_qs = User.objects.filter(email=source_email)
        else:
            source_qs = User.objects.filter(full_name__iexact=source_name)
            if not source_qs.exists():
                source_qs = User.objects.filter(username__iexact='teacher')

        def merge_unique_rows(source_rows, target_user, *, related_field: str, merge_fn=None):
            moved = 0
            for source_obj in source_rows:
                filter_kwargs = {related_field: target_user}
                if hasattr(source_obj, 'exam_id'):
                    filter_kwargs['exam_id'] = source_obj.exam_id
                if hasattr(source_obj, 'question_id'):
                    filter_kwargs['question_id'] = source_obj.question_id
                if hasattr(source_obj, 'conversation_id'):
                    filter_kwargs['conversation_id'] = source_obj.conversation_id

                existing = source_obj.__class__.objects.filter(**filter_kwargs).first()
                if existing:
                    if merge_fn:
                        merge_fn(existing, source_obj)
                        existing.save()
                    source_obj.delete()
                else:
                    setattr(source_obj, related_field, target_user)
                    source_obj.save()
                moved += 1
            return moved

        migrated = 0
        source_ids = list(source_qs.values_list('id', flat=True))
        for source_id in source_ids:
            if source_id == target.id:
                continue

            # Teacher-owned exams become owned by the real teacher account
            Exam.objects.filter(created_by_id=source_id).update(created_by=target)

            # Move any teacher-facing AI placeholders if they exist
            AIConversation.objects.filter(student_id=source_id).update(student=target)
            AIStudyPlan.objects.filter(student_id=source_id).update(student=target)
            AIQuiz.objects.filter(student_id=source_id).update(student=target)

            migrated += 1
            if delete_source:
                User.objects.filter(id=source_id).delete()

        self.stdout.write(self.style.SUCCESS(
            f'Rebound demo teacher data to {target_email}. Source users migrated: {migrated}. '
            f'Target name set to "{target_name}".'
        ))