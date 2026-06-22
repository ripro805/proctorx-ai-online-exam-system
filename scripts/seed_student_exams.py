"""Seed realistic university-level exams for the student exam section.

This script is idempotent: it checks by exam title and skips exams that already
exist.  It also resets Postgres sequences for `exams_exam`, `exams_question`,
`exams_choice`, and `exams_examenrollment` because the existing seed/fixture
data can desync the sequences, causing `UniqueViolation` on next insert.

Run from the project root:
    .\\.proctorai_env\\Scripts\\python.exe scripts\\seed_student_exams.py
"""

import os
import sys
from datetime import timedelta

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proctor_ai.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db import connection, transaction  # noqa: E402
from django.utils import timezone  # noqa: E402

from exams.models import (  # noqa: E402
    Choice,
    Exam,
    ExamEnrollment,
    Question,
    QuestionType,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Question helpers
# ---------------------------------------------------------------------------

def make_mcq(exam, text, choices, marks, explanation=""):
    """Create an MCQ question with choices and mark the correct one."""
    q = Question.objects.create(
        exam=exam,
        question_type=QuestionType.MCQ,
        text=text,
        marks=marks,
        explanation=explanation,
        correct_answer_data={"type": "mcq"},
    )
    correct_index = 0
    for idx, choice_text in enumerate(choices):
        is_correct = idx == correct_index
        Choice.objects.create(
            question=q,
            text=choice_text,
            is_correct=is_correct,
        )
    return q


def make_description(exam, text, reference_answer, marks, explanation=""):
    """Create a free-text (description) question."""
    return Question.objects.create(
        exam=exam,
        question_type=QuestionType.DESCRIPTION,
        text=text,
        marks=marks,
        explanation=explanation,
        correct_answer_data={"reference_answer": reference_answer},
    )


def make_image(exam, text, reference_answer, marks, explanation=""):
    """Create an image-based question with a reference answer."""
    return Question.objects.create(
        exam=exam,
        question_type=QuestionType.IMAGE,
        text=text,
        marks=marks,
        explanation=explanation,
        correct_answer_data={"reference_answer": reference_answer},
    )


def enroll_all_students(exam):
    """Enrol every active student in the given exam."""
    students = User.objects.filter(role="student", is_active=True)
    for student in students:
        ExamEnrollment.objects.get_or_create(
            exam=exam,
            student=student,
            defaults={"active": True},
        )


# ---------------------------------------------------------------------------
# Exam blueprints
# ---------------------------------------------------------------------------

EXAM_BLUEPRINTS = [
    {
        "key": "dsa_midterm",
        "title": "Data Structures & Algorithms - Midterm Examination",
        "subject": "Computer Science",
        "description": (
            "Midterm covering arrays, linked lists, trees, graphs, sorting, "
            "and complexity analysis. Includes a mix of MCQ and short-answer "
            "questions at university level."
        ),
        "duration_minutes": 120,
        "max_questions": 8,
        "status": "ongoing",
        "owner_email": "teacher@demo.com",
        "questions": [
            ("mcq", "What is the worst-case time complexity of quick sort?",
             ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"], 3,
             "Worst case is O(n^2) when the pivot is the smallest/largest element."),
            ("mcq", "Which data structure uses LIFO ordering?",
             ["Queue", "Stack", "Heap", "Trie"], 2,
             "Stack follows Last-In-First-Out ordering."),
            ("mcq", "A balanced BST with n nodes has what search complexity?",
             ["O(n)", "O(log n)", "O(1)", "O(n log n)"], 3,
             "Height is O(log n) when balanced, so search is O(log n)."),
            ("mcq", "Which traversal visits the root before its children?",
             ["Inorder", "Preorder", "Postorder", "Level-order"], 2,
             "Preorder: root, left, right."),
            ("mcq", "Hash table average-case lookup is:",
             ["O(1)", "O(log n)", "O(n)", "O(n^2)"], 3,
             "Average-case is O(1) with a good hash function and low load factor."),
            ("desc", "Explain why quicksort generally outperforms mergesort in practice despite having a worse worst-case complexity.",
             "Quicksort has lower constant factors, sorts in place (no auxiliary array), and benefits from CPU cache locality because it works on contiguous subarrays.", 4,
             "Mention in-place partitioning, cache locality, and lower constant factors."),
            ("desc", "Describe how a hash set handles collisions using chaining vs open addressing.",
             "Chaining stores collided keys in a linked list per bucket; open addressing probes for the next free slot using linear/quadratic/double hashing.", 4,
             "Compare memory layout and worst-case performance of both strategies."),
            ("desc", "When would you prefer an adjacency list over an adjacency matrix for a graph?",
             "When the graph is sparse (E << V^2). Lists use O(V+E) space and allow fast iteration of neighbors, while matrix uses O(V^2).", 4,
             "Mention sparse graphs, space complexity, and iteration cost."),
        ],
    },
    {
        "key": "lin_alg_quiz3",
        "title": "Linear Algebra - Quiz 3: Eigenvalues & Vector Spaces",
        "subject": "Mathematics",
        "description": (
            "Third quiz on eigenvalues, eigenvectors, diagonalization, and "
            "abstract vector spaces."
        ),
        "duration_minutes": 60,
        "max_questions": 6,
        "status": "ongoing",
        "owner_email": "teacher_new@demo.com",
        "questions": [
            ("mcq", "If A is an n x n matrix and Av = lambda v, then v is:",
             ["A null vector", "An eigenvector", "A scalar", "A basis"], 3,
             "v is an eigenvector with eigenvalue lambda."),
            ("mcq", "The trace of a matrix equals the sum of its:",
             ["Principal minors", "Eigenvalues", "Row sums", "Pivot positions"], 3,
             "trace(A) = sum of eigenvalues counting multiplicities."),
            ("mcq", "A matrix is diagonalizable iff it has:",
             ["Distinct eigenvalues", "n linearly independent eigenvectors", "Zero determinant", "Real entries"], 3,
             "Diagonalizability requires a full set of n linearly independent eigenvectors."),
            ("mcq", "The dimension of the eigenspace for lambda is:",
             ["Always 1", "geometric multiplicity of lambda", "algebraic multiplicity of lambda", "rank of A"], 3,
             "Geometric multiplicity = dim(null(A - lambda I))."),
            ("desc", "State and briefly justify the spectral theorem for real symmetric matrices.",
             "Every real symmetric matrix is orthogonally diagonalizable: A = Q D Q^T with Q orthogonal and D diagonal with real eigenvalues.", 3,
             "Mention orthogonal diagonalization, real eigenvalues, and orthonormal eigenvectors."),
            ("desc", "Show that similar matrices have the same eigenvalues.",
             "If B = P^{-1} A P, then det(B - lambda I) = det(P^{-1}(A - lambda I)P) = det(A - lambda I), so characteristic polynomial is unchanged.", 3,
             "Use determinant of similar matrices and the characteristic polynomial."),
        ],
    },
    {
        "key": "ochem_lab_quiz",
        "title": "Organic Chemistry - Lab Quiz: Reaction Mechanisms",
        "subject": "Chemistry",
        "description": (
            "Short lab quiz on SN1, SN2, E1, and E2 mechanisms with an image-"
            "based reaction-identification question."
        ),
        "duration_minutes": 45,
        "max_questions": 5,
        "status": "ongoing",
        "owner_email": "teacher@demo.com",
        "questions": [
            ("mcq", "Which mechanism is favored by a primary alkyl halide with a strong, bulky base?",
             ["SN1", "SN2", "E1", "E2"], 3,
             "Primary halides favor SN2; with bulky bases, E2 becomes competitive."),
            ("mcq", "An SN1 reaction proceeds via:",
             ["A single concerted step", "A carbocation intermediate", "A carbanion intermediate", "A radical intermediate"], 3,
             "SN1 is a two-step mechanism with a carbocation intermediate."),
            ("mcq", "Which substrate gives the highest E2 rate?",
             ["Primary alkyl halide", "Secondary alkyl halide", "Tertiary alkyl halide", "Methyl halide"], 3,
             "Tertiary halides have the most substituted beta-H and favor E2 with strong base."),
            ("desc", "Explain why SN2 reactions invert stereochemistry at the reacting carbon.",
             "The nucleophile attacks from the backside opposite the leaving group, producing a trigonal bipyramidal transition state that inverts configuration (Walden inversion).", 4,
             "Backside attack, single transition state, Walden inversion."),
            ("image", "Identify the reaction type shown in the diagram and predict the major product for 2-bromo-2-methylbutane with ethanol.",
             "The diagram shows a tertiary alkyl halide with a weak nucleophile/base in a polar protic solvent - this favors E1 elimination to give 2-methyl-2-butene as the major (Zaitsev) product.", 3,
             "Reference answer: E1 mechanism, major product 2-methyl-2-butene (Zaitsev)."),
        ],
    },
    {
        "key": "micro_final",
        "title": "Microeconomics - Final Examination",
        "subject": "Economics",
        "description": (
            "Comprehensive final covering supply and demand, consumer theory, "
            "production costs, market structures, and welfare economics."
        ),
        "duration_minutes": 180,
        "max_questions": 8,
        "status": "scheduled_tomorrow",
        "owner_email": "teacher_new@demo.com",
        "questions": [
            ("mcq", "If demand is Qd = 100 - 2P and supply is Qs = 20 + 3P, equilibrium price is:",
             ["8", "10", "12", "16"], 3,
             "100 - 2P = 20 + 3P -> 80 = 5P -> P = 16."),
            ("mcq", "A price ceiling set below equilibrium causes:",
             ["Surplus", "Shortage", "No effect", "Higher price"], 3,
             "A binding price ceiling below equilibrium creates excess demand (shortage)."),
            ("mcq", "Marginal cost equals average total cost when:",
             ["ATC is minimized", "MC is decreasing", "ATC is increasing", "MC is zero"], 3,
             "MC intersects ATC at ATC's minimum point."),
            ("mcq", "In perfect competition, firms earn zero economic profit in:",
             ["Short run", "Long run", "Both short and long run", "Neither"], 3,
             "Zero economic profit is a long-run equilibrium outcome in perfect competition."),
            ("mcq", "Consumer surplus is the area:",
             ["Below demand and above price", "Above demand and below price", "Below supply and above price", "Above MC and below price"], 3,
             "Consumer surplus is the area below the demand curve and above the price line."),
            ("desc", "Explain why the marginal revenue curve lies below the demand curve for a monopolist.",
             "A monopolist must lower the price on all units to sell one more, so marginal revenue = P + Q*(dP/dQ) which is below P when dP/dQ < 0.", 4,
             "Mention the need to lower price on all units and the MR = P(1 + 1/elasticity) relationship."),
            ("desc", "Discuss the conditions under which a market failure occurs and give two examples.",
             "Market failure occurs when free markets allocate resources inefficiently due to externalities, public goods, information asymmetries, or imperfect competition. Examples: pollution (negative externality) and vaccinations (positive externality).", 4,
             "Define Pareto inefficiency and list two concrete examples."),
            ("desc", "Compare allocative efficiency under perfect competition and monopoly.",
             "Perfect competition produces where P = MC, achieving allocative efficiency. Monopoly restricts output to where MR = MC and charges P > MC, creating deadweight loss.", 4,
             "Contrast P = MC vs P > MC and discuss welfare loss."),
        ],
    },
    {
        "key": "calc_eng_phys2",
        "title": "Calculus for Engineering Physics II - Live Midterm: Multivariable Calculus & Vector Fields",
        "subject": "Engineering Physics",
        "description": (
            "Live midterm for the second half of the calculus-for-physics "
            "sequence: multivariable functions, partial derivatives, line and "
            "surface integrals, and the classical vector field theorems "
            "(Green, Stokes, divergence)."
        ),
        "duration_minutes": 150,
        "max_questions": 9,
        "status": "ongoing",
        "owner_email": "teacher@demo.com",
        "questions": [
            ("mcq", "If f(x, y) = x^2 y + sin(xy), the partial derivative ∂f/∂x at (1, 0) is:",
             ["0", "1", "2", "3"], 3,
             "∂f/∂x = 2xy + y cos(xy); at (1, 0) this evaluates to 0."),
            ("mcq", "The gradient of a scalar field is always:",
             ["Parallel to the surface", "Perpendicular to the level surface", "Tangent to the level surface", "Zero inside a region of constant f"], 3,
             "Gradients are normal to level surfaces."),
            ("mcq", "Which identity relates a surface integral of curl F to a line integral of F?",
             ["Green's theorem", "Stokes' theorem", "Divergence theorem", "Fundamental theorem of calculus"], 3,
             "Stokes' theorem: ∬_S (curl F)·dS = ∮_∂S F·dr."),
            ("mcq", "The divergence theorem in 3D states ∭_V (∇·F) dV =",
             ["∮_∂V F·dS", "∮_∂V F·dr", "∬_S (curl F)·dS", "∫_V |F| dV"], 3,
             "Divergence theorem equates the volume integral of divergence to the flux through the closed surface."),
            ("mcq", "A conservative vector field F in a simply connected region satisfies:",
             ["∇·F = 0", "∇×F = 0", "F = 0", "|F| = constant"], 3,
             "Conservative fields are irrotational: their curl is zero."),
            ("mcq", "The Hessian matrix of a twice-differentiable scalar field f collects:",
             ["First partial derivatives", "Second partial derivatives", "Mixed integrals of F", "Components of ∇f"], 3,
             "H_ij = ∂²f/∂x_i ∂x_j."),
            ("desc", "State and apply the chain rule for a function f(x(t), y(t)) along a parametric curve, and use it to derive the gradient-form directional derivative D_u f = ∇f · u.",
             "df/dt = f_x dx/dt + f_y dy/dt = ∇f · r'(t). At t=0 with unit tangent u, df/ds = ∇f · u. The directional derivative is the projection of ∇f onto u.", 4,
             "Show both the chain rule step and the dot-product conclusion."),
            ("desc", "Use Stokes' theorem to compute the circulation of F = (-y, x, 0) around the unit circle in the xy-plane, and interpret the result geometrically.",
             "curl F = (0, 0, 2). For the unit disk S with upward normal, ∬_S 2 dA = 2π. Geometrically, F is a pure rotation of constant magnitude 1, so its circulation around a loop enclosing area π equals 2π (twice the enclosed area, by Green's theorem).", 4,
             "Compute curl, integrate over the disk, and link to rotation/area."),
            ("desc", "Explain why the divergence theorem fails when F has a singularity inside the volume, and describe a patched-region strategy that restores the result.",
             "At a singularity, F is not defined on the whole closed region, so the standard statement does not apply. Carve out a small sphere (or other surface) around the singularity, apply the theorem to the punctured region, and take the limit as the inner surface shrinks; the inner flux yields the singular contribution (e.g., 4π q for a point charge in Gauss's law).", 4,
             "Puncture the region, apply divergence theorem to the remainder, take the limit, and identify the singular flux."),
        ],
    },
    {
        "key": "lit_victorian",
        "title": "English Literature - Victorian Era: Authors, Themes, and Texts",
        "subject": "English Literature",
        "description": (
            "Survey quiz on major Victorian authors, key works, and recurring "
            "themes such as industrialisation, class, and empire."
        ),
        "duration_minutes": 90,
        "max_questions": 7,
        "status": "scheduled_tomorrow",
        "owner_email": "teacher@demo.com",
        "questions": [
            ("mcq", "Who wrote 'Great Expectations'?",
             ["Charles Dickens", "Thomas Hardy", "George Eliot", "Anthony Trollope"], 3,
             "Great Expectations was published by Charles Dickens in 1861."),
            ("mcq", "Which poem begins 'It is a tale told by an idiot'?",
             ["The Raven", "Macbeth soliloquy", "Prometheus Unbound", "In Memoriam"], 2,
             "The line is from Macbeth's soliloquy in Shakespeare's play."),
            ("mcq", "Which writer is associated with the 'Condition of England' novels?",
             ["Elizabeth Gaskell", "Walter Pater", "Oscar Wilde", "Dante Gabriel Rossetti"], 3,
             "Gaskell's North and South and Mary Barton exemplify the industrial-condition novel."),
            ("mcq", "The 'stuck-up' heroine of 'Pride and Prejudice' is:",
             ["Jane Bennet", "Lydia Bennet", "Elizabeth Bennet", "Charlotte Lucas"], 2,
             "Elizabeth Bennet is the witty, sometimes prejudiced heroine."),
            ("mcq", "Which Victorian poet wrote 'The Lady of Shalott'?",
             ["Tennyson", "Browning", "Arnold", "Hopkins"], 3,
             "Alfred, Lord Tennyson published 'The Lady of Shalott' in 1832 and 1842."),
            ("desc", "Discuss how the theme of social class shapes two Victorian novels of your choice.",
             "Discuss how class structures, social mobility, and class conflict drive plot and character. Strong answers reference specific scenes and characters (e.g., Pip's aspiration in Great Expectations, the unions vs management in North and South).", 4,
             "Reference specific novels, characters, and social stratification."),
            ("desc", "Analyse the role of the fallen woman in Victorian literature using one specific text.",
             "The 'fallen woman' trope - a woman who has transgressed sexual norms - is used to explore gender double standards. Reference a specific work such as Hardy's Tess of the d'Urbervilles or Gaskell's Ruth, discussing how the author's treatment reveals social hypocrisy.", 4,
             "Mention specific text, social context, and the author's critique."),
        ],
    },
]


# ---------------------------------------------------------------------------
# Sequence reset (Postgres)
# ---------------------------------------------------------------------------

def reset_postgres_sequences():
    """Reset Postgres sequences for the exams app tables."""
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        for table in ("exams_exam", "exams_question", "exams_choice", "exams_examenrollment"):
            cursor.execute(
                "SELECT setval(pg_get_serial_sequence(%s, 'id'), "
                "GREATEST(COALESCE((SELECT MAX(id) FROM {0}), 1), 1))".format(table),
                [table],
            )


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

def _compute_start_end(status, duration_minutes):
    now = timezone.now()
    if status == "ongoing":
        start = now - timedelta(minutes=30)
        end = start + timedelta(minutes=duration_minutes)
    elif status == "scheduled_tomorrow":
        tomorrow = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        start = tomorrow
        end = start + timedelta(minutes=duration_minutes)
    else:
        start = now
        end = start + timedelta(minutes=duration_minutes)
    return start, end


def _create_exam(blueprint):
    owner = User.objects.filter(email=blueprint["owner_email"]).first()
    if owner is None:
        print(f"  ! owner {blueprint['owner_email']} not found - skipping {blueprint['key']}")
        return None

    start, end = _compute_start_end(blueprint["status"], blueprint["duration_minutes"])

    with transaction.atomic():
        exam = Exam.objects.create(
            title=blueprint["title"],
            subject=blueprint["subject"],
            description=blueprint["description"],
            created_by=owner,
            duration_minutes=blueprint["duration_minutes"],
            max_questions=blueprint["max_questions"],
            start_time=start,
            end_time=end,
            is_published=True,
        )

        for q in blueprint["questions"]:
            kind = q[0]
            if kind == "mcq":
                make_mcq(exam, q[1], q[2], q[3], q[4])
            elif kind == "desc":
                make_description(exam, q[1], q[2], q[3], q[4])
            elif kind == "image":
                make_image(exam, q[1], q[2], q[3], q[4])

        # Recompute total_marks from the questions we just added.
        exam.total_marks = sum(q.marks for q in exam.questions.all())
        exam.save(update_fields=["total_marks"])

        enroll_all_students(exam)

    return exam


def seed():
    reset_postgres_sequences()

    print(f"Exam count before: {Exam.objects.count()}")
    for blueprint in EXAM_BLUEPRINTS:
        if Exam.objects.filter(title=blueprint["title"]).exists():
            existing = Exam.objects.get(title=blueprint["title"])
            print(f"  [{blueprint['status']}] skipped (exists) id={existing.id} {blueprint['title']}")
            continue
        exam = _create_exam(blueprint)
        if exam is not None:
            print(f"  [{blueprint['status']}] created id={exam.id} {exam.title}")
    print(f"Exam count after: {Exam.objects.count()}")


if __name__ == "__main__":
    seed()
