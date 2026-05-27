from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from exams.models import Exam, Question, Choice, ExamEnrollment
from results.models import Result
from proctoring.models import ProctorLog, StudentExamSession
from ai_tutor.models import AIConversation, AIStudyPlan

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo users, exams, questions, results, and proctoring logs'
    
    def add_arguments(self, parser):
        parser.add_argument('--admin-email', dest='admin_email', default='admin@proctorxai.com', help='Admin email to use or create')
        parser.add_argument('--teacher-email', dest='teacher_email', default='teacher@demo.com', help='Teacher email to use or create')
        parser.add_argument('--student-emails', dest='student_emails', default='', help='Comma separated student emails to use/create. If empty, demo students are used')
        parser.add_argument('--dry-run', action='store_true', dest='dry_run', help='Print actions without applying changes')

    QUESTION_BANK = {
        'Data Structures': [
            {
                'question': 'Which data structure provides $O(1)$ average-time lookup for key-based access when implemented with a good hash function?',
                'options': ['Queue', 'Hash table', 'Stack', 'Linked list'],
                'correct_index': 1,
                'explanation': 'A hash table gives constant-time average access because keys are mapped directly to buckets.',
            },
            {
                'question': 'Which operation is most naturally supported by a stack data structure?',
                'options': ['First-in first-out processing', 'Random access by index', 'Last-in first-out processing', 'Sorted traversal'],
                'correct_index': 2,
                'explanation': 'Stacks follow LIFO order, making them ideal for recursion, backtracking, and expression evaluation.',
            },
            {
                'question': 'In a binary search tree, what is the average-case time complexity of search when the tree remains reasonably balanced?',
                'options': ['$O(1)$', '$O(\log n)$', '$O(n)$', '$O(n^2)$'],
                'correct_index': 1,
                'explanation': 'Balanced trees keep height logarithmic, so search is $O(\log n)$ on average.',
            },
        ],
        'Algorithms': [
            {
                'question': 'Which algorithm guarantees the shortest path in a weighted graph without negative cycles?',
                'options': ['Depth First Search', 'Bellman-Ford Algorithm', 'Prim’s Algorithm', 'Binary Search'],
                'correct_index': 1,
                'explanation': 'Bellman-Ford correctly handles negative edge weights and computes shortest paths when no negative cycle exists.',
            },
            {
                'question': 'Which technique is most appropriate when the same subproblem is solved repeatedly in an optimization problem?',
                'options': ['Divide and conquer', 'Dynamic programming', 'Branch prediction', 'Backtracking only'],
                'correct_index': 1,
                'explanation': 'Dynamic programming stores subproblem results and reuses them, which is ideal for overlapping subproblems.',
            },
            {
                'question': 'What is the worst-case time complexity of binary search on a sorted array?',
                'options': ['$O(1)$', '$O(\log n)$', '$O(n)$', '$O(n \log n)$'],
                'correct_index': 1,
                'explanation': 'Binary search halves the search interval each step, giving logarithmic complexity.',
            },
        ],
        'DBMS': [
            {
                'question': 'Which normal form removes partial dependency on a composite primary key?',
                'options': ['First Normal Form', 'Second Normal Form', 'Third Normal Form', 'BCNF'],
                'correct_index': 1,
                'explanation': '2NF eliminates partial dependency by ensuring every non-key attribute depends on the whole key.',
            },
            {
                'question': 'Which ACID property ensures that a transaction moves the database from one valid state to another valid state?',
                'options': ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
                'correct_index': 1,
                'explanation': 'Consistency guarantees that constraints and rules remain satisfied before and after a transaction.',
            },
            {
                'question': 'What is the primary purpose of an index in a relational database?',
                'options': ['Increase storage fragmentation', 'Speed up data retrieval', 'Replace the primary key', 'Encrypt table rows'],
                'correct_index': 1,
                'explanation': 'Indexes improve lookup performance by reducing the amount of data scanned during reads.',
            },
        ],
        'Operating Systems': [
            {
                'question': 'Which condition is not one of the necessary conditions for deadlock?',
                'options': ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'],
                'correct_index': 2,
                'explanation': 'Preemption is not required for deadlock; in fact, the lack of preemption is one of the classic conditions.',
            },
            {
                'question': 'What is the main purpose of virtual memory in an operating system?',
                'options': ['To eliminate the need for RAM', 'To provide a larger logical address space than physical memory', 'To permanently store kernel code', 'To speed up CPU clock frequency'],
                'correct_index': 1,
                'explanation': 'Virtual memory lets programs use more address space than physical RAM by paging to secondary storage.',
            },
            {
                'question': 'Context switching in a multiprogramming system primarily allows the CPU to do what?',
                'options': ['Increase disk capacity', 'Switch between processes or threads efficiently', 'Avoid all interrupts', 'Remove the need for scheduling'],
                'correct_index': 1,
                'explanation': 'Context switches save and restore execution state so the CPU can move between runnable tasks.',
            },
        ],
        'Computer Networks': [
            {
                'question': 'Which protocol provides reliable, connection-oriented communication?',
                'options': ['UDP', 'TCP', 'ICMP', 'ARP'],
                'correct_index': 1,
                'explanation': 'TCP uses acknowledgements, sequencing, and retransmission to provide reliable delivery.',
            },
            {
                'question': 'What is the main function of a subnet mask in IPv4 networking?',
                'options': ['Encrypt packets', 'Separate network and host portions of an IP address', 'Assign MAC addresses', 'Translate domain names'],
                'correct_index': 1,
                'explanation': 'A subnet mask identifies which bits belong to the network and which to the host.',
            },
            {
                'question': 'Which routing protocol is commonly used within an autonomous system to share route information dynamically?',
                'options': ['BGP', 'OSPF', 'FTP', 'SMTP'],
                'correct_index': 1,
                'explanation': 'OSPF is an interior gateway protocol used within a single autonomous system.',
            },
        ],
        'Software Engineering': [
            {
                'question': 'Which document is primarily used to capture system requirements from the user perspective?',
                'options': ['Requirements specification', 'Source code', 'Test log', 'Deployment script'],
                'correct_index': 0,
                'explanation': 'Requirements specifications define functional and non-functional expectations before implementation begins.',
            },
            {
                'question': 'Which software process model is most suitable when project risks must be evaluated and reduced iteratively?',
                'options': ['Waterfall', 'Spiral', 'Big bang', 'Code-and-fix'],
                'correct_index': 1,
                'explanation': 'The Spiral model emphasizes repeated risk analysis and iteration.',
            },
            {
                'question': 'What does traceability in software engineering help ensure?',
                'options': ['That each test maps back to a requirement', 'That code is shorter', 'That the UI is animated', 'That the build is always manual'],
                'correct_index': 0,
                'explanation': 'Traceability links requirements, design, implementation, and testing artifacts across the lifecycle.',
            },
        ],
        'Artificial Intelligence': [
            {
                'question': 'Which search strategy uses heuristics to guide the exploration toward a goal state?',
                'options': ['Breadth First Search', 'A* search', 'Linear search', 'Bubble sort'],
                'correct_index': 1,
                'explanation': 'A* combines path cost and heuristic estimate to prioritize promising nodes.',
            },
            {
                'question': 'In game playing, which algorithm is used to evaluate optimal moves under adversarial conditions?',
                'options': ['Minimax', 'K-means', 'Apriori', 'Naive Bayes'],
                'correct_index': 0,
                'explanation': 'Minimax models alternating player choices and selects moves that maximize the minimum payoff.',
            },
            {
                'question': 'Which of the following is a characteristic of supervised learning?',
                'options': ['Training with labeled data', 'Training without data', 'Only rule-based reasoning', 'No output variable'],
                'correct_index': 0,
                'explanation': 'Supervised learning uses labeled examples to learn a mapping from inputs to outputs.',
            },
        ],
        'Machine Learning': [
            {
                'question': 'What is overfitting in machine learning?',
                'options': ['Model performs well on training data but poorly on unseen data', 'Model has too few features', 'Model always uses gradient descent', 'Model cannot be trained'],
                'correct_index': 0,
                'explanation': 'Overfitting means the model memorizes training data patterns that do not generalize.',
            },
            {
                'question': 'Which metric is especially useful for evaluating classification performance on imbalanced datasets?',
                'options': ['Accuracy only', 'Precision and recall', 'Mean squared error', 'R-squared'],
                'correct_index': 1,
                'explanation': 'Precision and recall reveal class-wise performance better than accuracy when classes are imbalanced.',
            },
            {
                'question': 'Which optimization method is most commonly used to update weights in gradient-based learning?',
                'options': ['Gradient descent', 'Topological sort', 'Binary search', 'Floyd–Warshall'],
                'correct_index': 0,
                'explanation': 'Gradient descent iteratively updates parameters in the direction that reduces loss.',
            },
        ],
        'Compiler Design': [
            {
                'question': 'Which phase of a compiler groups characters into tokens?',
                'options': ['Parsing', 'Lexical analysis', 'Code generation', 'Optimization'],
                'correct_index': 1,
                'explanation': 'Lexical analysis converts raw character streams into meaningful tokens.',
            },
            {
                'question': 'Why is left recursion removed from grammars before top-down parsing?',
                'options': ['To improve disk speed', 'To prevent infinite recursion in recursive-descent parsers', 'To enable machine learning', 'To compress source code'],
                'correct_index': 1,
                'explanation': 'Top-down parsers may recurse indefinitely if the grammar is left recursive.',
            },
            {
                'question': 'What is the main purpose of register allocation in code generation?',
                'options': ['Encrypt machine code', 'Assign variables to limited CPU registers efficiently', 'Increase token count', 'Replace syntax analysis'],
                'correct_index': 1,
                'explanation': 'Register allocation maps variables to fast CPU registers to improve runtime performance.',
            },
        ],
        'Cyber Security': [
            {
                'question': 'What is the key difference between hashing and encryption?',
                'options': ['Hashing is reversible; encryption is not', 'Encryption is reversible with a key; hashing is designed to be one-way', 'Both are the same', 'Hashing uses public key cryptography'],
                'correct_index': 1,
                'explanation': 'Encryption can be reversed with the correct key, while hashing is intended to be one-way.',
            },
            {
                'question': 'Which attack is commonly mitigated by using prepared statements or parameterized queries?',
                'options': ['Phishing', 'SQL injection', 'Denial of service', 'Packet sniffing'],
                'correct_index': 1,
                'explanation': 'Prepared statements separate code from data, reducing the risk of SQL injection.',
            },
            {
                'question': 'Which cryptographic approach uses a public key for encryption and a private key for decryption?',
                'options': ['Symmetric encryption', 'Asymmetric encryption', 'Hashing', 'Steganography'],
                'correct_index': 1,
                'explanation': 'Asymmetric cryptography relies on a public/private key pair for secure communication.',
            },
        ],
        'OOP': [
            {
                'question': 'Which OOP principle allows a derived class to provide a specific implementation of a base class method?',
                'options': ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'],
                'correct_index': 2,
                'explanation': 'Polymorphism enables method overriding so objects can respond differently to the same message.',
            },
            {
                'question': 'What is the main purpose of encapsulation in object-oriented programming?',
                'options': ['Hide internal state and expose controlled access', 'Make every variable global', 'Remove class hierarchies', 'Replace interfaces'],
                'correct_index': 0,
                'explanation': 'Encapsulation protects object state by restricting direct access to internal data.',
            },
            {
                'question': 'Which feature best describes inheritance?',
                'options': ['A class acquiring properties and behavior from another class', 'A loop over objects', 'A way to serialize data', 'A database relationship only'],
                'correct_index': 0,
                'explanation': 'Inheritance allows code reuse by deriving new classes from existing ones.',
            },
        ],
        'Web Development': [
            {
                'question': 'Which HTTP method is typically used to retrieve a resource without modifying it?',
                'options': ['POST', 'PUT', 'GET', 'DELETE'],
                'correct_index': 2,
                'explanation': 'GET requests are used to fetch data and are intended to be safe and idempotent.',
            },
            {
                'question': 'What is the purpose of CORS in web applications?',
                'options': ['To style forms', 'To control cross-origin resource sharing in browsers', 'To compress HTML', 'To validate SQL queries'],
                'correct_index': 1,
                'explanation': 'CORS defines which origins can access browser resources across domains.',
            },
            {
                'question': 'Which security mechanism helps protect against CSRF attacks?',
                'options': ['JWT in localStorage only', 'Anti-CSRF tokens', 'DNS caching', 'Image compression'],
                'correct_index': 1,
                'explanation': 'Anti-CSRF tokens verify that the request originated from a legitimate user session.',
            },
        ],
    }

    def handle(self, *args, **options):
        now = timezone.now()

        def ensure_user(email: str, username: str, role: str, full_name: str, dry_run_flag: bool = False, force_full_name: bool = False):
            """Find or create a user. Does not overwrite existing user's password.

            If dry_run_flag is True, no writes are performed; function will return existing user if found or None.
            """
            user = User.objects.filter(email=email).first() or User.objects.filter(username=username).first()
            if not user:
                if dry_run_flag:
                    self.stdout.write(self.style.WARNING(f'[DRY] Would create user {email} (role={role})'))
                    return None
                user = User.objects.create_user(email=email, username=username, role=role, full_name=full_name, password='demo1234')
                return user
            # existing user: update non-sensitive fields only
            updated = False
            if user.email != email:
                user.email = email
                updated = True
            if not user.username:
                user.username = username
                updated = True
            if force_full_name or not user.full_name:
                user.full_name = full_name
                updated = True
            if user.role != role:
                user.role = role
                updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            # Do NOT change existing user's password
            if updated and not dry_run_flag:
                user.save()
            elif updated and dry_run_flag:
                self.stdout.write(self.style.WARNING(f'[DRY] Would update user {email}: set username/full_name/role/is_active'))
            return user

        admin_email = options.get('admin_email')
        teacher_email = options.get('teacher_email')
        student_emails_opt = options.get('student_emails')
        dry_run = options.get('dry_run')

        # Prepare student email list
        if student_emails_opt:
            student_emails = [e.strip() for e in student_emails_opt.split(',') if e.strip()]
        else:
            student_emails = [f'student{idx+1}@demo.com' for idx in range(6)]

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN: No changes will be made.'))

        admin = ensure_user(admin_email, 'admin', 'admin', 'Admin User', dry_run_flag=dry_run)
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        teacher = ensure_user(teacher_email, 'teacher', 'teacher', 'Dr. Sarah Kim', dry_run_flag=dry_run)

        demo_names = ['Rifatriz', 'Maria Garcia', 'James Chen', 'Priya Patel', 'Omar Hassan', 'Sofia Rossi']
        students = []
        for idx, email in enumerate(student_emails):
            name = demo_names[idx] if idx < len(demo_names) else f'Demo Student {idx+1}'
            username = email.split('@')[0]
            user = ensure_user(email, username, 'student', name, dry_run_flag=dry_run, force_full_name=True)
            if user is None and dry_run:
                # in dry-run mode, return a lightweight placeholder object with email only
                class _P: pass
                p = _P()
                p.email = email
                p.id = '(dry-run)'
                students.append(p)
                continue
            students.append(user)

        exams = []
        exam_specs = []
        for idx, subject in enumerate(self.QUESTION_BANK.keys()):
            title = f'{subject} — University MCQ Set'
            start = now + timedelta(days=idx + 1)
            end = start + timedelta(minutes=90)
            exam_specs.append((title, subject, start, end, True))

        for title, subject, start, end, published in exam_specs:
            exam, _ = Exam.objects.get_or_create(
                title=title,
                defaults={
                    'subject': subject,
                    'description': f'Realistic university-level MCQ practice for {subject}.',
                    'created_by': teacher,
                    'duration_minutes': int((end - start).total_seconds() / 60),
                    'start_time': start,
                    'end_time': end,
                    'is_published': published,
                },
            )
            exam.subject = subject
            exam.description = f'Realistic university-level MCQ practice for {subject}.'
            exam.created_by = teacher
            exam.duration_minutes = int((end - start).total_seconds() / 60)
            exam.start_time = start
            exam.end_time = end
            exam.is_published = published
            exam.max_questions = len(self.QUESTION_BANK.get(subject, []))
            exam.save()
            exams.append(exam)

        for exam in exams:
            # Replace questions in exam with canonical bank (idempotent)
            exam.questions.all().delete()
            for idx, item in enumerate(self.QUESTION_BANK.get(exam.subject, []), start=1):
                q = Question.objects.create(
                    exam=exam,
                    text=item['question'],
                    marks=1,
                    explanation=item['explanation'],
                    is_in_bank=True,
                    correct_answer_data={'correct_option': chr(ord('A') + item['correct_index'])},
                )
                for choice_index, text in enumerate(item['options']):
                    Choice.objects.create(question=q, text=text, is_correct=(choice_index == item['correct_index']))

        for student in students:
            for exam in exams:
                ExamEnrollment.objects.get_or_create(exam=exam, student=student, defaults={'active': True})

        completed_exam = exams[-1]
        for student in students:
            result, created = Result.objects.get_or_create(
                student=student,
                exam=completed_exam,
                defaults={
                    'total_questions': completed_exam.questions.count(),
                    'correct_answers': random.randint(2, completed_exam.questions.count()),
                    'score': 0,
                    'percentage': 0,
                },
            )
            if created:
                total = result.total_questions or 1
                result.score = result.correct_answers
                result.percentage = round((result.correct_answers / total) * 100, 2)
                result.save()

        # Ensure AI placeholders (conversations and study plans) exist for students
        for student in students:
            try:
                AIConversation.objects.get_or_create(student=student, title='Seeded AI Conversation')
                AIStudyPlan.objects.get_or_create(student=student, subject='General')
            except Exception:
                pass

        # Seed proctor logs for ongoing exam
        ongoing_exam = exams[1] if len(exams) > 1 else (exams[0] if exams else None)
        for student in students[:3]:
            StudentExamSession.objects.update_or_create(
                student=student,
                exam=ongoing_exam,
                defaults={'status': 'ongoing', 'started_at': now - timedelta(minutes=20)},
            )
            if not ProctorLog.objects.filter(student=student, exam=ongoing_exam, event_type='tab_switch').exists():
                ProctorLog.objects.create(
                    student=student,
                    exam=ongoing_exam,
                    event_type='tab_switch',
                    message='Tab switch detected',
                )

        summary = [
            f'Admin account: {admin.email} (id={admin.id})',
            f'Teacher account: {teacher.email} (id={teacher.id})',
            f'Students: {", ".join([s.email for s in students])}',
            f'Exams seeded: {len(exams)}',
        ]
        for line in summary:
            self.stdout.write(line)
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run complete — no changes were persisted (note: ensure --dry-run halts before writes in production).'))
        else:
            self.stdout.write(self.style.SUCCESS('Seeded demo data (admin/teacher/student accounts, exams, questions, results).'))
