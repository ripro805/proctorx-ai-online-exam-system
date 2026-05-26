from rest_framework import serializers

from exams.models import Choice, Exam, Question, StudentAnswer
from exams.models import ExamProgress


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'text', 'is_correct')


class StudentChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'text')


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'exam', 'exam_title', 'text', 'marks', 'choices')


class StudentQuestionSerializer(serializers.ModelSerializer):
    choices = StudentChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'exam', 'text', 'marks', 'choices')


class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    date = serializers.DateField(source='start_time', read_only=True)

    class Meta:
        model = Exam
        fields = (
            'id',
            'title',
            'subject',
            'description',
            'created_by',
            'created_by_name',
            'created_by_email',
            'duration_minutes',
            'start_time',
            'end_time',
            'is_published',
            'total_marks',
            'created_at',
            'questions_count',
            'date',
            'questions',
        )
        read_only_fields = ('created_by', 'total_marks', 'created_at')


class StudentExamSerializer(serializers.ModelSerializer):
    questions = StudentQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    date = serializers.DateField(source='start_time', read_only=True)

    class Meta:
        model = Exam
        fields = (
            'id',
            'title',
            'subject',
            'description',
            'created_by',
            'duration_minutes',
            'start_time',
            'end_time',
            'is_published',
            'total_marks',
            'created_at',
            'questions_count',
            'date',
            'questions',
        )
        read_only_fields = ('created_by', 'total_marks', 'created_at')


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ('id', 'student', 'exam', 'question', 'choice', 'is_correct', 'answered_at')
        read_only_fields = ('student', 'is_correct', 'answered_at')


class ExamProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamProgress
        fields = ('id', 'student', 'exam', 'answers', 'updated_at')
        read_only_fields = ('student', 'updated_at')
