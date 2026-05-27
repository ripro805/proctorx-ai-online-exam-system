from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from hashlib import sha1

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from exams.models import Choice, Exam, Question

User = get_user_model()


@dataclass(frozen=True)
class TopicBlueprint:
    topic: str
    correct: str
    distractors: tuple[str, str, str]
    explanation: str


QUESTION_VARIANTS = [
    '{subject}: which option best describes {topic}?',
    'In {subject}, what is the primary purpose of {topic}?',
    'Which statement about {topic} is correct in the context of {subject}?',
    'For {subject}, {topic} is most closely associated with which concept?',
    'What best characterizes {topic} in university-level {subject}?',
    'Which answer best explains why {topic} matters in {subject}?',
    'In a typical {subject} exam, {topic} is most likely tested for its ability to {topic_verb}.',
    'Which option correctly matches {topic} with its key property in {subject}?',
    'When studying {subject}, {topic} is commonly used to {topic_action}.',
    'Which choice is the best practical example of {topic} in {subject}?',
    'What is the most accurate exam-style description of {topic}?',
    'Which statement distinguishes {topic} from a related but different concept in {subject}?',
    'Which of the following is the strongest reason to use {topic} in {subject}?',
    'In problem-solving for {subject}, {topic} helps to {topic_benefit}.',
    'Which concept is {topic} most directly connected to in {subject}?',
    'Which answer reflects the core idea behind {topic}?',
    'For {subject}, {topic} is best understood as a technique to {topic_action}.',
    'What is a realistic application of {topic} in {subject}?',
    'Which option would you select if the question is asking about {topic} in {subject}?',
    'Choose the most correct explanation of {topic} for an upper-level {subject} exam.',
]


def T(topic: str, correct: str, distractor1: str, distractor2: str, distractor3: str, explanation: str) -> TopicBlueprint:
    return TopicBlueprint(topic=topic, correct=correct, distractors=(distractor1, distractor2, distractor3), explanation=explanation)


SUBJECT_BLUEPRINTS: dict[str, list[TopicBlueprint]] = {
    'Data Structures': [
        T('hash table collisions and bucket handling', 'Collision resolution methods keep average lookup fast', 'Collision handling slows every operation to O(n)', 'Hash tables store values only in sorted order', 'Hash tables cannot store key-value pairs', 'Hash tables stay efficient when collisions are handled using chaining or open addressing.'),
        T('stack LIFO behavior', 'The most recent element is removed first', 'The first element inserted is always removed first', 'Elements are accessed randomly by index', 'Elements are sorted automatically', 'Stacks follow last-in, first-out order.'),
        T('queue FIFO behavior', 'The first element inserted is removed first', 'The last element inserted is removed first', 'Only one element can ever be stored', 'Queues sort elements by priority automatically', 'Queues follow first-in, first-out order.'),
        T('binary search tree ordering', 'Left subtree keys are smaller and right subtree keys are larger', 'Every node must have exactly two children', 'Traversal always returns values in reverse order', 'A BST stores only duplicate values', 'BST ordering keeps search efficient when the tree remains balanced.'),
        T('binary heap priority property', 'The root contains the minimum or maximum value depending on heap type', 'The tree is always perfectly balanced in every level', 'Values are stored in alphabetical order', 'Heap operations require no comparisons', 'Heaps support efficient access to the highest-priority element.'),
    ],
    'Algorithms': [
        T('Dijkstra shortest path', 'It finds shortest paths in graphs with non-negative weights', 'It only works on unweighted trees', 'It is designed for sorting arrays', 'It cannot compute any path distances', 'Dijkstra is the standard greedy shortest-path algorithm for non-negative graphs.'),
        T('Bellman-Ford relaxation', 'It can handle negative edge weights without negative cycles', 'It requires a balanced binary tree', 'It always runs in O(log n)', 'It only works for directed acyclic graphs', 'Bellman-Ford repeatedly relaxes edges and tolerates negative weights.'),
        T('dynamic programming overlapping subproblems', 'It stores subproblem results and reuses them', 'It avoids storing any intermediate result', 'It works only for string encryption', 'It is the same as random search', 'Dynamic programming saves repeated computations using memoization or tabulation.'),
        T('greedy choice property', 'It makes the locally optimal choice at each step', 'It explores every possibility exhaustively', 'It only applies to database normalization', 'It guarantees success for every problem', 'Greedy algorithms work when local optimality leads to global optimality.'),
        T('binary search on sorted data', 'It halves the search range each step', 'It scans every item from left to right', 'It requires a graph structure', 'It is used only for hashing', 'Binary search is logarithmic because the search space shrinks by half.'),
    ],
    'DBMS': [
        T('normalization and 2NF', '2NF removes partial dependency on a composite key', '3NF allows transitive dependency by design', '1NF requires duplicated rows only', 'BCNF is used only for indexing', '2NF ensures non-key attributes depend on the whole key.'),
        T('indexing for retrieval', 'Indexes speed up data retrieval by reducing scans', 'Indexes always slow down every query', 'Indexes replace all constraints automatically', 'Indexes are used only for encryption', 'Indexes help the DBMS locate rows faster.'),
        T('ACID consistency', 'The database remains in a valid state before and after a transaction', 'Rows are always physically stored in one file', 'All transactions run in parallel without locks', 'The database never uses rollback logs', 'Consistency means database rules and constraints are preserved.'),
        T('joins in relational databases', 'They combine rows from related tables using matching keys', 'They delete duplicate rows automatically', 'They convert SQL into HTML', 'They encrypt foreign key columns', 'Joins are essential for combining normalized tables.'),
        T('transaction isolation', 'Concurrent transactions should not interfere incorrectly with each other', 'The database must never commit any changes', 'Users must always see uncommitted rows', 'Tables cannot be accessed by multiple users', 'Isolation keeps concurrent execution predictable.'),
    ],
    'Operating Systems': [
        T('deadlock necessary conditions', 'Circular wait is one of the classic deadlock conditions', 'Preemption is required to create deadlock', 'Paging automatically prevents deadlock', 'CPU scheduling removes all deadlock risks', 'Deadlock needs a circular wait among processes.'),
        T('virtual memory paging', 'It provides a larger logical address space than physical RAM', 'It removes the need for secondary storage', 'It speeds the CPU clock directly', 'It stores only compiler symbols', 'Virtual memory lets processes use memory larger than physical RAM.'),
        T('CPU scheduling', 'It decides which ready process gets the CPU next', 'It encrypts process memory', 'It formats the hard disk', 'It removes interrupts from the system', 'Scheduling coordinates CPU sharing among processes.'),
        T('semaphores for synchronization', 'They coordinate access to shared resources', 'They are used only for file compression', 'They replace all algorithms', 'They are the same as virtual memory pages', 'Semaphores help prevent race conditions.'),
        T('page replacement', 'The OS decides which page to evict when RAM is full', 'Pages are never swapped out', 'The compiler chooses the page to remove', 'It only applies to network packets', 'Page replacement keeps memory usage manageable.'),
    ],
    'Computer Networks': [
        T('TCP reliable transport', 'TCP provides reliable connection-oriented delivery', 'TCP is connectionless and unreliable by design', 'TCP only runs on local files', 'TCP does not use acknowledgements', 'TCP uses acknowledgements and retransmissions for reliability.'),
        T('subnet mask', 'It separates network and host portions of an IP address', 'It encrypts DNS queries', 'It replaces routing tables', 'It stores MAC addresses only', 'Subnet masks define how an IP address is partitioned.'),
        T('OSPF routing', 'OSPF is an interior gateway protocol within an autonomous system', 'OSPF is used only for email', 'OSPF is a transport-layer protocol', 'OSPF is the same as ARP', 'OSPF is common inside enterprise and campus networks.'),
        T('DNS name resolution', 'It maps domain names to IP addresses', 'It converts IP addresses to binary code only', 'It encrypts packets end-to-end', 'It blocks all HTTP traffic', 'DNS lets humans use memorable names instead of numbers.'),
        T('HTTP request methods', 'GET is used to retrieve a resource safely', 'GET is used to delete resources', 'GET is used only for encryption', 'GET creates a database table', 'GET is the standard read operation in HTTP.'),
    ],
    'Software Engineering': [
        T('requirements specification', 'It captures the system requirements from the user perspective', 'It is only a runtime log file', 'It contains only compiled binaries', 'It replaces testing altogether', 'Requirements documents define what the system should do.'),
        T('spiral model risk analysis', 'It evaluates and reduces risk iteratively', 'It skips risk assessment completely', 'It is only for hardware chips', 'It forbids prototype development', 'The Spiral model emphasizes iterative risk reduction.'),
        T('software testing', 'Testing verifies that the implementation meets the requirements', 'Testing is only for deployment scripts', 'Testing removes the need for code review', 'Testing is the same as coding', 'Testing validates behavior against expected outcomes.'),
        T('traceability', 'It links requirements, design, code, and tests', 'It makes code shorter automatically', 'It replaces documentation', 'It only tracks database rows', 'Traceability helps teams follow every requirement through the lifecycle.'),
        T('UML modeling', 'It visualizes system structure and behavior', 'It compiles Java code', 'It encrypts source files', 'It is used only in operating systems', 'UML diagrams help communicate design clearly.'),
    ],
    'Artificial Intelligence': [
        T('A* search', 'It uses heuristics and path cost to guide search', 'It sorts data alphabetically', 'It works only on databases', 'It never uses a heuristic', 'A* combines cost-so-far and estimated cost-to-go.'),
        T('minimax in games', 'It chooses the move that maximizes the minimum gain', 'It randomly selects a move', 'It is used for hashing passwords', 'It only works in linear regression', 'Minimax is the classic adversarial search method.'),
        T('supervised learning', 'It learns from labeled data', 'It learns without any training data', 'It requires no output variable', 'It only uses rules written by hand', 'Supervised learning maps inputs to labeled outputs.'),
        T('knowledge-based expert systems', 'They use rules and stored knowledge to infer answers', 'They require no knowledge base', 'They are only for image compression', 'They work only offline with no rules', 'Expert systems imitate human decision making with rules.'),
        T('heuristics in AI search', 'They provide an informed estimate toward the goal', 'They guarantee the exact answer immediately', 'They remove the need for state space', 'They are the same as random guessing', 'Heuristics guide efficient search.'),
    ],
    'Machine Learning': [
        T('overfitting', 'The model performs well on training data but poorly on unseen data', 'The model cannot fit the training data at all', 'The model only uses one feature', 'The model always improves test accuracy', 'Overfitting means memorizing patterns that do not generalize.'),
        T('precision and recall', 'They are useful on imbalanced classification datasets', 'They are only for image compression', 'They replace training completely', 'They measure compiler speed', 'Precision and recall reveal class-specific behavior.'),
        T('gradient descent', 'It updates parameters in the direction that reduces loss', 'It sorts samples by size', 'It is a database join method', 'It converts text to tokens', 'Gradient descent is the standard optimization algorithm for many ML models.'),
        T('cross-validation', 'It estimates generalization by evaluating on multiple folds', 'It trains only on a single sample', 'It removes the need for validation data', 'It only applies to clustering', 'Cross-validation gives a more stable estimate of performance.'),
        T('regularization', 'It reduces overfitting by penalizing model complexity', 'It increases memorization', 'It guarantees zero bias', 'It replaces the dataset with labels', 'Regularization improves generalization.'),
    ],
    'Compiler Design': [
        T('lexical analysis', 'It converts characters into tokens', 'It translates machine code into Python', 'It performs network routing', 'It is a database normalization step', 'Lexical analysis is the first major phase of compilation.'),
        T('parsing', 'It checks whether tokens follow the grammar rules', 'It encrypts source code', 'It allocates heap memory', 'It is used for web styling', 'Parsing builds the syntactic structure of a program.'),
        T('left recursion removal', 'It prevents infinite recursion in top-down parsers', 'It increases disk usage', 'It is required for SQL joins', 'It is used only in sorting', 'Top-down parsers can loop forever on left-recursive grammars.'),
        T('register allocation', 'It assigns variables to limited CPU registers efficiently', 'It stores all variables in ROM', 'It deletes unused classes', 'It is a network protocol', 'Register allocation improves machine-code performance.'),
        T('code optimization', 'It improves the generated program without changing meaning', 'It changes the language syntax', 'It removes the need for parsing', 'It only works for databases', 'Optimization makes compiled code more efficient.'),
    ],
    'Cyber Security': [
        T('hashing versus encryption', 'Hashing is one-way while encryption is reversible with a key', 'Hashing and encryption are identical', 'Encryption cannot be reversed', 'Hashing uses no mathematical function', 'Hashing protects integrity; encryption protects confidentiality.'),
        T('SQL injection', 'It is mitigated by parameterized queries and prepared statements', 'It is fixed by using more CSS', 'It is a hardware overheating issue', 'It is caused by weak Wi-Fi only', 'Parameterized queries separate code from data.'),
        T('asymmetric encryption', 'It uses a public key for encryption and a private key for decryption', 'It uses the same key for all users', 'It is the same as hashing', 'It cannot be used for communication', 'Public/private key pairs enable secure exchange.'),
        T('CSRF tokens', 'They help verify requests come from legitimate sessions', 'They compress images', 'They replace passwords entirely', 'They stop DNS lookups', 'Anti-CSRF tokens prevent forged cross-site requests.'),
        T('multi-factor authentication', 'It requires more than one proof of identity', 'It uses only a username', 'It stores passwords in plain text', 'It removes encryption', 'MFA strengthens login security by adding factors.'),
    ],
    'OOP': [
        T('encapsulation', 'It hides internal state behind controlled access', 'It makes every field public', 'It removes object methods', 'It is only for databases', 'Encapsulation protects object data.'),
        T('inheritance', 'A class can derive behavior and properties from another class', 'A loop can repeat forever', 'It replaces all interfaces', 'It is a network packet feature', 'Inheritance supports code reuse through parent-child relationships.'),
        T('polymorphism', 'The same interface can behave differently for different objects', 'A function must have only one argument', 'Objects cannot override methods', 'It is the same as normalization', 'Polymorphism allows flexibility in method behavior.'),
        T('abstraction', 'It focuses on essential features and hides unnecessary detail', 'It exposes every implementation detail', 'It prevents reuse', 'It is a file compression method', 'Abstraction simplifies complex systems for users.'),
        T('composition', 'Objects can be built from other objects', 'A class cannot contain any field', 'It removes object relationships', 'It is only for UI colors', 'Composition models has-a relationships.'),
    ],
    'Web Development': [
        T('HTTP GET', 'It retrieves data without modifying the resource', 'It is used to delete a resource', 'It always encrypts the body', 'It can only create databases', 'GET is the standard safe read method.'),
        T('CORS', 'It controls which origins can access browser resources', 'It formats HTML tables', 'It replaces authentication', 'It compresses JSON automatically', 'CORS is a browser security policy for cross-origin requests.'),
        T('CSRF protection', 'Anti-CSRF tokens validate that requests come from the expected app', 'It is handled by image resizing', 'It is the same as caching', 'It only affects server logs', 'CSRF tokens reduce forged request attacks.'),
        T('REST principles', 'Resources are accessed using stateless HTTP operations', 'Each request must reuse hidden server state', 'APIs must use XML only', 'REST requires TCP port 22', 'REST APIs use standard HTTP methods and stateless design.'),
        T('cookies and sessions', 'They help maintain user state across requests', 'They are used only for CSS animations', 'They replace the server completely', 'They are the same as SQL joins', 'Cookies and sessions are common state-management tools.'),
    ],
}


def rotate_options(correct: str, distractors: tuple[str, str, str], seed_text: str) -> tuple[list[str], str]:
    options = [correct, *distractors]
    rotation = int(sha1(seed_text.encode('utf-8')).hexdigest(), 16) % 4
    rotated = options[rotation:] + options[:rotation]
    correct_letter = chr(ord('A') + rotated.index(correct))
    return rotated, correct_letter


def normalize_blueprint(topic: str, blueprint: TopicBlueprint, subject: str, variant_index: int) -> dict[str, str]:
    template = QUESTION_VARIANTS[variant_index % len(QUESTION_VARIANTS)]
    words = topic.split()
    topic_verb = 'explain the idea' if len(words) <= 2 else 'apply the concept'
    topic_action = 'solve exam-style problems' if len(words) <= 2 else 'analyze practical scenarios'
    topic_benefit = 'work efficiently' if len(words) <= 2 else 'make correct design choices'
    stem = template.format(
        subject=subject,
        topic=topic,
        topic_verb=topic_verb,
        topic_action=topic_action,
        topic_benefit=topic_benefit,
    )
    options, correct_letter = rotate_options(
        blueprint.correct,
        blueprint.distractors,
        f'{subject}:{topic}:{variant_index}:{stem}',
    )
    return {
        'question': stem,
        'options': options,
        'correct_index': ord(correct_letter) - ord('A'),
        'explanation': blueprint.explanation,
    }


class Command(BaseCommand):
    help = 'Generate and seed 100 real MCQs for each subject into PostgreSQL.'

    def add_arguments(self, parser):
        parser.add_argument('--teacher-email', dest='teacher_email', default='teacher@demo.com', help='Teacher email to attach exams to')
        parser.add_argument('--start-days-from-now', dest='start_days_from_now', type=int, default=1, help='How many days from now to start the first exam')
        parser.add_argument('--dry-run', action='store_true', dest='dry_run', help='Preview generated counts without writing to DB')

    @transaction.atomic
    def handle(self, *args, **options):
        teacher_email = options['teacher_email']
        dry_run = options['dry_run']
        start_days_from_now = options['start_days_from_now']

        teacher = User.objects.filter(email=teacher_email).first()
        if not teacher:
            raise self.CommandError(f'Teacher user not found: {teacher_email}')

        now = timezone.now()
        summary = []

        for subject_index, (subject, blueprints) in enumerate(SUBJECT_BLUEPRINTS.items()):
            if len(blueprints) != 5:
                raise self.CommandError(f'Subject {subject} must define exactly 5 blueprints for 100 questions.')

            title = f'{subject} — University MCQ Set'
            start = now + timedelta(days=start_days_from_now + subject_index)
            end = start + timedelta(minutes=90)

            if dry_run:
                summary.append(f'[DRY] {subject}: 100 questions would be generated')
                continue

            exam, _ = Exam.objects.get_or_create(title=title, defaults={
                'subject': subject,
                'description': f'Realistic university-level MCQ practice for {subject}.',
                'created_by': teacher,
                'duration_minutes': 90,
                'start_time': start,
                'end_time': end,
                'is_published': True,
                'max_questions': 100,
            })
            exam.subject = subject
            exam.description = f'Realistic university-level MCQ practice for {subject}.'
            exam.created_by = teacher
            exam.duration_minutes = 90
            exam.start_time = start
            exam.end_time = end
            exam.is_published = True
            exam.max_questions = 100
            exam.total_marks = 100
            exam.save()

            exam.questions.all().delete()

            generated_questions = []
            for topic_index, blueprint in enumerate(blueprints):
                for variant_index in range(20):
                    generated_questions.append(normalize_blueprint(blueprint.topic, blueprint, subject, topic_index * 20 + variant_index))

            if len(generated_questions) != 100:
                raise self.CommandError(f'Generated {len(generated_questions)} questions for {subject} instead of 100.')

            for q_data in generated_questions:
                q = Question.objects.create(
                    exam=exam,
                    text=q_data['question'],
                    marks=1,
                    explanation=q_data['explanation'],
                    is_in_bank=True,
                    correct_answer_data={'correct_option': chr(ord('A') + q_data['correct_index'])},
                )
                for choice_index, choice_text in enumerate(q_data['options']):
                    Choice.objects.create(question=q, text=choice_text, is_correct=(choice_index == q_data['correct_index']))

            summary.append(f'{subject}: seeded 100 questions')

        for line in summary:
            self.stdout.write(line)
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run complete — no database changes were made.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Seeded 100 questions for {len(SUBJECT_BLUEPRINTS)} subjects into PostgreSQL.'))
