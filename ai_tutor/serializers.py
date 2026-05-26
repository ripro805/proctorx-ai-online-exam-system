from rest_framework import serializers

from ai_tutor.models import AIConversation, AIMessage, AIQuiz, AIStudyPlan


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = ('id', 'role', 'content', 'provider', 'extra_data', 'created_at')


class AIConversationSerializer(serializers.ModelSerializer):
    messages = AIMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    def get_message_count(self, obj):
        return obj.messages.count()

    class Meta:
        model = AIConversation
        fields = ('id', 'title', 'subject', 'mode', 'metadata', 'is_archived', 'created_at', 'updated_at', 'message_count', 'messages')


class AIStudyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIStudyPlan
        fields = ('id', 'subject', 'exam', 'plan_data', 'progress_data', 'created_at', 'updated_at')


class AIQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIQuiz
        fields = ('id', 'topic', 'difficulty', 'quiz_data', 'provider', 'created_at')
