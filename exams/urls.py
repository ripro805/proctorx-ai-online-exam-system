from django.urls import include, path
from rest_framework.routers import DefaultRouter

from exams.views import ChoiceViewSet, ExamStartAPIView, ExamSubmitAPIView, ExamViewSet, QuestionViewSet

router = DefaultRouter()
router.register(r'exams', ExamViewSet, basename='exams')
router.register(r'questions', QuestionViewSet, basename='questions')
router.register(r'choices', ChoiceViewSet, basename='choices')

urlpatterns = [
    path('', include(router.urls)),
    path('exams/create/', ExamViewSet.as_view({'post': 'create'}), name='exam-create'),
    path('questions/create/', QuestionViewSet.as_view({'post': 'create'}), name='question-create'),
    path('exam/start/', ExamStartAPIView.as_view(), name='exam-start'),
    path('exam/submit/', ExamSubmitAPIView.as_view(), name='exam-submit'),
]
