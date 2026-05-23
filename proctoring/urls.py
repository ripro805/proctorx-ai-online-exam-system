from django.urls import include, path
from rest_framework.routers import DefaultRouter

from proctoring.views import (
    CopyAttemptAPIView,
    FullscreenExitAPIView,
    ProctorFrameAPIView,
    ProctorLogCreateAPIView,
    ProctorLogViewSet,
    RightClickAPIView,
    StudentProctorLogAPIView,
    TabSwitchAPIView,
    TeacherActiveStudentsAPIView,
    TeacherMonitoringSessionsAPIView,
)

router = DefaultRouter()
router.register(r'proctoring/logs', ProctorLogViewSet, basename='proctoring-logs')

urlpatterns = [
    path('', include(router.urls)),
    path('proctoring/log/', ProctorLogCreateAPIView.as_view(), name='proctoring-log'),
    path('proctoring/frame/', ProctorFrameAPIView.as_view(), name='proctoring-frame'),
    path('proctoring/my-logs/', StudentProctorLogAPIView.as_view(), name='proctoring-my-logs'),
    path('proctoring/tab-switch/', TabSwitchAPIView.as_view(), name='proctoring-tab-switch'),
    path('proctoring/fullscreen-exit/', FullscreenExitAPIView.as_view(), name='proctoring-fullscreen-exit'),
    path('proctoring/copy-attempt/', CopyAttemptAPIView.as_view(), name='proctoring-copy-attempt'),
    path('proctoring/right-click/', RightClickAPIView.as_view(), name='proctoring-right-click'),
    path('proctoring/teacher/sessions/', TeacherMonitoringSessionsAPIView.as_view(), name='proctoring-teacher-sessions'),
    path('proctoring/teacher/active-students/', TeacherActiveStudentsAPIView.as_view(), name='proctoring-teacher-active-students'),
]
