from rest_framework import serializers

from results.models import Result


class ResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    exam_subject = serializers.CharField(source='exam.subject', read_only=True)
    exam_start_time = serializers.DateTimeField(source='exam.start_time', read_only=True)
    exam_end_time = serializers.DateTimeField(source='exam.end_time', read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)

    class Meta:
        model = Result
        fields = (
            'id',
            'student',
            'student_name',
            'student_email',
            'exam',
            'exam_title',
            'exam_subject',
            'exam_start_time',
            'exam_end_time',
            'total_questions',
            'correct_answers',
            'score',
            'percentage',
            'rank',
            'created_at',
        )

    def get_student_name(self, obj):
        return obj.student.full_name or obj.student.username
