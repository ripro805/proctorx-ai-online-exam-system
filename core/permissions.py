from rest_framework.permissions import BasePermission

from exams.models import Exam, ExamEnrollment


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ('teacher', 'admin')
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')


def can_student_access_exam(student, exam: Exam) -> bool:
    """Allow access if the exam is published and either:
    - there are no enrollments configured yet (open exam), or
    - the student has an active enrollment.
    """
    if not student or not student.is_authenticated or student.role != 'student':
        return False
    if not exam or not exam.is_published:
        return False
    active_enrollments = ExamEnrollment.objects.filter(exam=exam, active=True)
    if not active_enrollments.exists():
        return True
    return active_enrollments.filter(student=student).exists()
