from django.urls import path

from ai_tutor.views import AIChatAPIView, AIStudyPlanAPIView, AIQuizAPIView, AIQuizSubmitAPIView, AIPerformanceAnalysisAPIView, TeacherAIAnalyticsAPIView

urlpatterns = [
    path('ai/chat/', AIChatAPIView.as_view(), name='ai-chat'),
    path('ai/study-plan/', AIStudyPlanAPIView.as_view(), name='ai-study-plan'),
    path('ai/generate-quiz/', AIQuizAPIView.as_view(), name='ai-generate-quiz'),
    path('ai/submit-quiz/', AIQuizSubmitAPIView.as_view(), name='ai-submit-quiz'),
    path('ai/performance-analysis/', AIPerformanceAnalysisAPIView.as_view(), name='ai-performance-analysis'),
    path('ai/teacher-analytics/', TeacherAIAnalyticsAPIView.as_view(), name='ai-teacher-analytics'),
]
