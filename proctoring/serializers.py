from rest_framework import serializers

from proctoring.models import ProctorLog, StudentExamSession


class ProctorLogSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    severity = serializers.SerializerMethodField()

    class Meta:
        model = ProctorLog
        fields = ('id', 'student', 'student_name', 'exam', 'exam_title', 'event_type', 'message', 'timestamp', 'image', 'severity')
        read_only_fields = ('student', 'timestamp')

    def get_student_name(self, obj):
        return obj.student.full_name or obj.student.username

    def get_severity(self, obj):
        if obj.event_type in ('multiple_faces', 'exam_terminated'):
            return 'HIGH'
        if obj.event_type in ('tab_switch', 'suspicious_movement', 'fullscreen_exit', 'no_face'):
            return 'MEDIUM'
        return 'LOW'



class StudentExamSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = StudentExamSession
        fields = ('id', 'student', 'student_name', 'exam', 'exam_title', 'started_at', 'ended_at', 'status', 'warning_count')
        read_only_fields = ('student', 'started_at', 'ended_at')

    def get_student_name(self, obj):
        return obj.student.full_name or obj.student.username
