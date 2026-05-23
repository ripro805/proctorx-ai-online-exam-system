import json

from channels.generic.websocket import AsyncWebsocketConsumer


class ExamMonitorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.exam_id = self.scope['url_route']['kwargs']['exam_id']
        self.group_name = f'exam_{self.exam_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        payload = json.loads(text_data)
        await self.channel_layer.group_send(
            self.group_name,
            {'type': 'broadcast_message', 'message': payload},
        )

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps(event['message']))


# Backwards-compatible alias and requested name
class ExamMonitoringConsumer(ExamMonitorConsumer):
    """Alias for ExamMonitorConsumer to match naming expectations."""
    pass
