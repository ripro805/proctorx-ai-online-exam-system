from django.urls import include, path
from rest_framework.routers import DefaultRouter

from results.views import ResultViewSet, ResultsAnalyticsAPIView, StudentPerformanceAPIView, StudentResultViewSet

router = DefaultRouter()
router.register(r'results', ResultViewSet, basename='results')
router.register(r'results/student', StudentResultViewSet, basename='results-student')

urlpatterns = [
    path('', include(router.urls)),
    path('results/analytics/', ResultsAnalyticsAPIView.as_view(), name='results-analytics'),
    path('results/performance/', StudentPerformanceAPIView.as_view(), name='results-performance'),
]
