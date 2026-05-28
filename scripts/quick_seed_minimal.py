import os, json
from pathlib import Path
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data.cleaned.json'
os.environ.setdefault('DJANGO_SETTINGS_MODULE','proctor_ai.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from exams.models import Exam, Question, Choice
User = get_user_model()
user_map = {u.email: u for u in User.objects.all()}
fallback_user = next(iter(user_map.values())) if user_map else None

print('Users in DB:', len(user_map), 'fallback_user:', getattr(fallback_user,'email',None))
with P.open(encoding='utf-8') as f:
    data = json.load(f)
# group objects by model
by_model = {}
for obj in data:
    by_model.setdefault(obj['model'], []).append(obj)

created_exams = {}
# create exams
for obj in by_model.get('exams.exam', [])[:20]:
    fields = obj.get('fields', {})
    title = fields.get('title') or f'Imported Exam {obj.get("pk")}'
    description = fields.get('description','')
    start_time = fields.get('start_time')
    end_time = fields.get('end_time')
    try:
        if start_time:
            st = datetime.fromisoformat(start_time.replace('Z','+00:00'))
        else:
            st = datetime.now(timezone.utc)
    except Exception:
        st = datetime.now(timezone.utc)
    try:
        if end_time:
            et = datetime.fromisoformat(end_time.replace('Z','+00:00'))
        else:
            et = st
    except Exception:
        et = st
    created_by = fields.get('created_by')
    if isinstance(created_by, list) and created_by:
        cb = created_by[0]
    else:
        cb = created_by
    if isinstance(cb, str) and cb in user_map:
        user = user_map[cb]
    else:
        user = fallback_user
    try:
        exam = Exam.objects.create(title=title, subject=fields.get('subject',''), description=description, created_by=user, duration_minutes=fields.get('duration_minutes',60), max_questions=fields.get('max_questions',0), start_time=st, end_time=et, is_published=bool(fields.get('is_published', False)), total_marks=fields.get('total_marks',0))
        created_exams[obj.get('pk')] = exam
        print('Created exam', exam.pk, exam.title)
    except Exception as e:
        print('Exam create failed', obj.get('pk'), e)

# create questions and choices limited
questions = by_model.get('exams.question', [])
choices = by_model.get('exams.choice', [])
choices_by_question = {}
for c in choices:
    f = c.get('fields', {})
    qid = f.get('question')
    choices_by_question.setdefault(qid, []).append(c)

for q in questions[:1000]:
    f = q.get('fields', {})
    exam_old = f.get('exam')
    exam = created_exams.get(exam_old)
    if not exam:
        continue
    text = f.get('text','')
    qtype = f.get('question_type','mcq')
    if qtype not in ('mcq','description','image'):
        qtype = 'mcq'
    marks = f.get('marks',1) or 1
    try:
        question = Question.objects.create(exam=exam, text=text, question_type=qtype, marks=marks, correct_answer_data=f.get('correct_answer_data',{}), explanation=f.get('explanation',''), is_in_bank=bool(f.get('is_in_bank', False)))
    except Exception as e:
        print('Question create failed', q.get('pk'), e)
        continue
    qchoices = choices_by_question.get(q.get('pk'), [])[:4]
    for c in qchoices:
        cf = c.get('fields', {})
        try:
            Choice.objects.create(question=question, text=cf.get('text',''), is_correct=bool(cf.get('is_correct', False)))
        except Exception as e:
            print('Choice create failed', c.get('pk'), e)
print('Seeding complete. Exams created:', len(created_exams))
