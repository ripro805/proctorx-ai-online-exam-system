"""
ASGI config for proctor_ai project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

from ai_tutor.middleware import JwtAuthMiddlewareStack
from proctor_ai.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proctor_ai.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
	{
		'http': django_asgi_app,
		'websocket': JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
	}
)
