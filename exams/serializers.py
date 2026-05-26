from rest_framework import serializers

from exams.models import Choice, Exam, Question, QuestionType, StudentAnswer
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
    choices = ChoiceSerializer(many=True, required=False)
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    subject = serializers.CharField(source='exam.subject', read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'exam', 'exam_title', 'subject', 'text', 'question_type', 'marks', 'correct_answer_data', 'explanation', 'is_in_bank', 'choices')
        extra_kwargs = {'exam': {'required': False}}

    def create(self, validated_data):
        choices = validated_data.pop('choices', [])
        question = Question.objects.create(**validated_data)
        for choice_data in choices:
            Choice.objects.create(question=question, **choice_data)
        return question


class StudentQuestionSerializer(serializers.ModelSerializer):
    choices = StudentChoiceSerializer(many=True, read_only=True)
    subject = serializers.CharField(source='exam.subject', read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'exam', 'subject', 'text', 'question_type', 'marks', 'choices')


class ExamSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    date = serializers.SerializerMethodField()

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
            'max_questions',
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

    def get_date(self, obj):
        return obj.start_time.date() if obj.start_time else None

    def validate(self, attrs):
        questions = attrs.get('questions') or []
        max_questions = attrs.get('max_questions') or getattr(self.instance, 'max_questions', 0) or 0
        if max_questions and len(questions) > max_questions:
            raise serializers.ValidationError({'questions': f'You can create at most {max_questions} questions for this exam.'})

        for question in questions:
            q_type = question.get('question_type') or QuestionType.MCQ
            choices = question.get('choices') or []
            correct = question.get('correct_answer_data') or {}
            if q_type == QuestionType.MCQ:
                if len(choices) < 2:
                    raise serializers.ValidationError({'questions': 'MCQ questions require at least 2 choices.'})
                if not any(choice.get('is_correct') for choice in choices):
                    raise serializers.ValidationError({'questions': 'MCQ questions require one correct choice.'})
            elif q_type in (QuestionType.DESCRIPTION, QuestionType.IMAGE):
                if not correct:
                    raise serializers.ValidationError({'questions': f'{q_type.title()} questions require a correct_answer_data payload.'})
        return attrs

    def create(self, validated_data):
        questions = validated_data.pop('questions', [])
        if not validated_data.get('max_questions'):
            validated_data['max_questions'] = len(questions)
        exam = Exam.objects.create(**validated_data)
        total_marks = 0
        for question_data in questions:
            choices = question_data.pop('choices', [])
            question_data['exam'] = exam
            question = Question.objects.create(**question_data)
            total_marks += question.marks
            for choice_data in choices:
                Choice.objects.create(question=question, **choice_data)
        if total_marks:
            exam.total_marks = total_marks
            exam.save(update_fields=['total_marks'])
        return exam


class StudentExamSerializer(serializers.ModelSerializer):
    questions = StudentQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(source='questions.count', read_only=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = (
            'id',
            'title',
            'subject',
            'description',
            'created_by',
            'duration_minutes',
            'max_questions',
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

    def get_date(self, obj):
        return obj.start_time.date() if obj.start_time else None


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ('id', 'student', 'exam', 'question', 'choice', 'answer_data', 'is_correct', 'answered_at')
        read_only_fields = ('student', 'is_correct', 'answered_at')


class ExamProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamProgress
        fields = ('id', 'student', 'exam', 'answers', 'updated_at')
        read_only_fields = ('student', 'updated_at')
