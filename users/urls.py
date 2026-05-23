from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import LoginAPIView, LogoutAPIView, ProfileAPIView, RegisterAPIView, UserRoleUpdateAPIView

urlpatterns = [
    path('auth/register/', RegisterAPIView.as_view(), name='auth-register'),
    path('auth/login/', LoginAPIView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/profile/', ProfileAPIView.as_view(), name='auth-profile'),
    path('auth/logout/', LogoutAPIView.as_view(), name='auth-logout'),
    path('auth/users/<int:pk>/role/', UserRoleUpdateAPIView.as_view(), name='auth-user-role-update'),
]
