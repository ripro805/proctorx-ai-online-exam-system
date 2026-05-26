from django.urls import path

from proctoring.consumers import ExamMonitorConsumer, GlobalProctoringConsumer

websocket_urlpatterns = [
    path('ws/exam/<int:exam_id>/', ExamMonitorConsumer.as_asgi()),
    path('ws/proctoring/', GlobalProctoringConsumer.as_asgi()),
]
