from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from users.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
	model = CustomUser
	list_display = ('email', 'username', 'role', 'is_active', 'is_staff')
	list_filter = ('role', 'is_active', 'is_staff')
	ordering = ('email',)
	search_fields = ('email', 'username')
	fieldsets = (
		(None, {'fields': ('email', 'username', 'password')}),
		('Roles', {'fields': ('role',)}),
		('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
		('Dates', {'fields': ('last_login',)}),
	)
	add_fieldsets = (
		(None, {'fields': ('email', 'username', 'role', 'password1', 'password2')}),
	)
