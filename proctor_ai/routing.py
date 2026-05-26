from django.urls import path

from ai_tutor.consumers import AITutorConsumer
from proctoring.consumers import ExamMonitorConsumer, GlobalProctoringConsumer

websocket_urlpatterns = [
    path('ws/ai-tutor/', AITutorConsumer.as_asgi()),
    path('ws/exam/<int:exam_id>/', ExamMonitorConsumer.as_asgi()),
    path('ws/proctoring/', GlobalProctoringConsumer.as_asgi()),
]
