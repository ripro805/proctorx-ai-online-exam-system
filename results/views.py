from django.db.models import Avg, Count
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsStudent, IsTeacher
from results.models import Result
from results.serializers import ResultSerializer


class ResultViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = ResultSerializer

	def get_queryset(self):
		user = self.request.user
		if user.role in ('teacher', 'admin'):
			return Result.objects.all()
		return Result.objects.filter(student=user)

	def get_permissions(self):
		return [permissions.IsAuthenticated()]


class StudentResultViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = ResultSerializer
	permission_classes = [IsStudent]

	def get_queryset(self):
		return Result.objects.filter(student=self.request.user)


class ResultsAnalyticsAPIView(APIView):
	permission_classes = [IsTeacher]

	def get(self, request):
		data = Result.objects.values('exam').annotate(
			attempts=Count('id'),
			average_score=Avg('score'),
			average_percentage=Avg('percentage'),
		)
		return Response({'analytics': list(data)}, status=status.HTTP_200_OK)


class StudentPerformanceAPIView(APIView):
	permission_classes = [IsStudent]

	def get(self, request):
		results = Result.objects.filter(student=request.user)
		avg_percentage = results.aggregate(avg=Avg('percentage'))['avg'] or 0
		return Response({'average_percentage': avg_percentage, 'total_exams': results.count()})
