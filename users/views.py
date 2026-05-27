from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from core.permissions import IsAdmin
from users.serializers import (
	CustomTokenObtainPairSerializer,
	PasswordResetSerializer,
	UserProfileSerializer,
	UserProfileUpdateSerializer,
	UserRegisterSerializer,
	UserRoleUpdateSerializer,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterAPIView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		serializer = UserRegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginAPIView(TokenObtainPairView):
	permission_classes = [permissions.AllowAny]
	serializer_class = CustomTokenObtainPairSerializer


class PasswordResetAPIView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		serializer = PasswordResetSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class ProfileAPIView(APIView):
	def get(self, request):
		return Response(UserProfileSerializer(request.user).data)

	def patch(self, request):
		serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		user = serializer.save()
		return Response(UserProfileSerializer(user).data)

	def put(self, request):
		return self.patch(request)


class LogoutAPIView(APIView):
	def post(self, request):
		refresh = request.data.get('refresh')
		if not refresh:
			return Response({'detail': 'refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
		token = RefreshToken(refresh)
		token.blacklist()
		return Response({'detail': 'logged out'}, status=status.HTTP_205_RESET_CONTENT)


class UserRoleUpdateAPIView(APIView):
	permission_classes = [IsAdmin]

	def patch(self, request, pk):
		user = get_object_or_404(User, pk=pk)
		serializer = UserRoleUpdateSerializer(user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(UserProfileSerializer(user).data)

	def put(self, request, pk):
		return self.patch(request, pk)
