from django.urls import path

from ai_tutor.views import AIChatAPIView, AIStudyPlanAPIView, AIQuizAPIView, AIPerformanceAnalysisAPIView

urlpatterns = [
    path('ai/chat/', AIChatAPIView.as_view(), name='ai-chat'),
    path('ai/study-plan/', AIStudyPlanAPIView.as_view(), name='ai-study-plan'),
    path('ai/generate-quiz/', AIQuizAPIView.as_view(), name='ai-generate-quiz'),
    path('ai/performance-analysis/', AIPerformanceAnalysisAPIView.as_view(), name='ai-performance-analysis'),
]
