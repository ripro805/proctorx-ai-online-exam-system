from rest_framework import serializers

from proctoring.models import ProctorLog, StudentExamSession


class ProctorLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = ProctorLog
        fields = ('id', 'student', 'student_name', 'exam', 'exam_title', 'event_type', 'message', 'timestamp', 'image')
        read_only_fields = ('student', 'timestamp')



class StudentExamSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = StudentExamSession
        fields = ('id', 'student', 'student_name', 'exam', 'exam_title', 'started_at', 'ended_at', 'status', 'warning_count')
        read_only_fields = ('student', 'started_at', 'ended_at')
