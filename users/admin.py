from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from users.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
	model = CustomUser
	list_display = ('email', 'username', 'full_name', 'role', 'is_active', 'is_staff')
	list_filter = ('role', 'is_active', 'is_staff')
	ordering = ('email',)
	search_fields = ('email', 'username', 'full_name')
	fieldsets = (
		(None, {'fields': ('email', 'username', 'full_name', 'password')}),
		('Profile', {'fields': ('institution', 'student_id', 'preferences')}),
		('Roles', {'fields': ('role',)}),
		('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
		('Dates', {'fields': ('last_login',)}),
	)
	add_fieldsets = (
		(None, {'fields': ('email', 'username', 'full_name', 'role', 'password1', 'password2')}),
	)
