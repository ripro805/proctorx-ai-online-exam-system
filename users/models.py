from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
	def _generate_username(self, email: str) -> str:
		base = (email.split('@')[0] or 'user').replace(' ', '').lower()
		candidate = base
		index = 1
		while self.model.objects.filter(username=candidate).exists():
			candidate = f"{base}{index}"
			index += 1
		return candidate

	def create_user(self, email, password=None, **extra_fields):
		if not email:
			raise ValueError('Email is required')
		email = self.normalize_email(email)
		if not extra_fields.get('username'):
			extra_fields['username'] = self._generate_username(email)
		if not extra_fields.get('full_name'):
			extra_fields['full_name'] = extra_fields.get('username')
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, email, password=None, **extra_fields):
		extra_fields.setdefault('role', 'admin')
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
	ROLE_CHOICES = (
		('student', 'Student'),
		('teacher', 'Teacher'),
		('admin', 'Admin'),
	)

	email = models.EmailField(unique=True)
	username = models.CharField(max_length=150, unique=True)
	full_name = models.CharField(max_length=255, blank=True)
	institution = models.CharField(max_length=255, blank=True)
	student_id = models.CharField(max_length=64, blank=True)
	preferences = models.JSONField(default=dict, blank=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
	is_active = models.BooleanField(default=True)
	is_staff = models.BooleanField(default=False)
	date_joined = models.DateTimeField(auto_now_add=True)

	objects = UserManager()

	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['username']

	def __str__(self):
		return f'{self.email} ({self.role})'
