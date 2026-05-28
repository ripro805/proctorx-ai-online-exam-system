import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proctor_ai.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

from ai_tutor.middleware import JwtAuthMiddlewareStack
from proctor_ai.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
    }
)