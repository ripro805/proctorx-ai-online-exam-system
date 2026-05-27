from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from exams.models import Choice, Exam, Question, QuestionType


User = get_user_model()


class ExamSubmissionTests(TransactionTestCase):
	reset_sequences = True

	def setUp(self):
		self.client = APIClient()
		self.teacher = User.objects.create_user(email='teacher@example.com', password='pass', role='teacher')
		self.student = User.objects.create_user(email='student@example.com', password='pass', role='student')
		now = timezone.now()
		self.exam = Exam.objects.create(
			title='Subjective Exam',
			subject='Computer Science',
			description='Test exam',
			created_by=self.teacher,
			duration_minutes=60,
			max_questions=3,
			start_time=now - timedelta(minutes=1),
			end_time=now + timedelta(hours=1),
			is_published=True,
			total_marks=4,
		)

	def _authenticate(self):
		self.client.force_authenticate(user=self.student)

	def test_student_exam_payload_hides_teacher_answers(self):
		Question.objects.create(
			exam=self.exam,
			text='Explain encapsulation',
			question_type=QuestionType.DESCRIPTION,
			marks=1,
			correct_answer_data={'text': 'Encapsulation hides internal state.'},
		)

		self._authenticate()
		res = self.client.get(f'/api/exams/{self.exam.id}/')
		self.assertEqual(res.status_code, 200)
		payload = res.json()
		questions = payload.get('questions') or []
		self.assertEqual(len(questions), 1)
		self.assertNotIn('correct_answer_data', questions[0])
		self.assertEqual(questions[0]['question_type'], 'description')

	@patch('exams.views.grade_subjective_answer')
	def test_submit_grades_description_and_image_with_ai_helper(self, mock_grade):
		desc_q = Question.objects.create(
			exam=self.exam,
			text='What is encapsulation?',
			question_type=QuestionType.DESCRIPTION,
			marks=1,
			correct_answer_data={'text': 'It hides internal state.'},
		)
		img_q = Question.objects.create(
			exam=self.exam,
			text='Upload the diagram',
			question_type=QuestionType.IMAGE,
			marks=2,
			correct_answer_data={'image': 'data:image/png;base64,teacher-image'},
		)
		mcq_q = Question.objects.create(
			exam=self.exam,
			text='Which choice is correct?',
			question_type=QuestionType.MCQ,
			marks=1,
		)
		Choice.objects.create(question=mcq_q, text='Correct', is_correct=True)
		Choice.objects.create(question=mcq_q, text='Wrong', is_correct=False)

		def side_effect(question, answer_payload, exam_subject=''):
			if question.id == desc_q.id:
				return {'is_correct': True, 'score_awarded': 1, 'confidence': 0.95, 'feedback': 'Strong answer'}
			if question.id == img_q.id:
				return {'is_correct': True, 'score_awarded': 2, 'confidence': 0.9, 'feedback': 'Visual match'}
			return {'is_correct': True, 'score_awarded': 1, 'confidence': 1, 'feedback': 'MCQ'}

		mock_grade.side_effect = side_effect

		self._authenticate()
		res = self.client.post('/api/exam/submit/', {
			'exam_id': self.exam.id,
			'answers': [
				{'question_id': desc_q.id, 'answer_text': 'It hides internal state.'},
				{'question_id': img_q.id, 'answer_image': 'data:image/png;base64,student-image'},
				{'question_id': mcq_q.id, 'choice_id': mcq_q.choices.first().id},
			],
		}, format='json')
		self.assertEqual(res.status_code, 200)
		data = res.json()
		self.assertEqual(data['score'], 4)
		self.assertEqual(data['percentage'], 100)
