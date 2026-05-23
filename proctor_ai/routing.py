from django.urls import path

from proctoring.consumers import ExamMonitorConsumer

websocket_urlpatterns = [
    path('ws/exam/<int:exam_id>/', ExamMonitorConsumer.as_asgi()),
]
