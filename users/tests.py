from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


User = get_user_model()


class UserProfileUpdateTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email='student@example.com',
			password='old-pass-123',
			role='student',
			full_name='Old Name',
			phone_number='01700000000',
		)

	def test_profile_patch_updates_name_email_phone_and_password(self):
		self.client.force_authenticate(user=self.user)
		res = self.client.patch('/api/auth/profile/', {
			'name': 'New Name',
			'email': 'newstudent@example.com',
			'phone_number': '01811112222',
			'password': 'new-pass-123',
		}, format='json')

		self.assertEqual(res.status_code, 200)
		payload = res.json()
		self.assertEqual(payload['name'], 'New Name')
		self.assertEqual(payload['email'], 'newstudent@example.com')
		self.assertEqual(payload['phone_number'], '01811112222')

		self.user.refresh_from_db()
		self.assertEqual(self.user.full_name, 'New Name')
		self.assertEqual(self.user.email, 'newstudent@example.com')
		self.assertEqual(self.user.phone_number, '01811112222')
		self.assertTrue(self.user.check_password('new-pass-123'))
