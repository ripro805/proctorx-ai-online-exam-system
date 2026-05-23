from django.contrib import admin

from exams.models import Choice, Exam, Question, StudentAnswer

admin.site.register(Exam)
admin.site.register(Question)
admin.site.register(Choice)
admin.site.register(StudentAnswer)
