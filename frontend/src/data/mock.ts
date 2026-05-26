export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number; // minutes
  questions: number;
  date: string;
  status: "upcoming" | "ongoing" | "completed";
  score?: number;
}

export const studentExams: Exam[] = [
  { id: "e1", title: "Advanced Algorithms", subject: "Computer Science", duration: 90, questions: 40, date: "2026-06-02", status: "upcoming" },
  { id: "e2", title: "Linear Algebra Midterm", subject: "Mathematics", duration: 60, questions: 30, date: "2026-05-25", status: "ongoing" },
  { id: "e3", title: "Quantum Mechanics", subject: "Physics", duration: 120, questions: 50, date: "2026-05-10", status: "completed", score: 87 },
  { id: "e4", title: "Organic Chemistry", subject: "Chemistry", duration: 75, questions: 35, date: "2026-05-08", status: "completed", score: 92 },
  { id: "e5", title: "Data Structures Final", subject: "Computer Science", duration: 90, questions: 40, date: "2026-04-28", status: "completed", score: 78 },
];

export const performanceData = [
  { month: "Jan", score: 72 }, { month: "Feb", score: 78 }, { month: "Mar", score: 81 },
  { month: "Apr", score: 85 }, { month: "May", score: 88 }, { month: "Jun", score: 91 },
];

export const teacherStats = {
  totalExams: 24, activeExams: 6, students: 1248, violations: 18,
};

export const adminStats = {
  totalUsers: 4827, activeExams: 32, violations: 127, uptime: 99.98,
};

export const violationData = [
  { day: "Mon", count: 4 }, { day: "Tue", count: 6 }, { day: "Wed", count: 3 },
  { day: "Thu", count: 8 }, { day: "Fri", count: 5 }, { day: "Sat", count: 2 }, { day: "Sun", count: 1 },
];

export const examQuestions = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  question: `Question ${i + 1}: Which of the following best describes the time complexity of a balanced binary search tree lookup operation?`,
  options: [
    "O(1) — constant time access regardless of size",
    "O(log n) — logarithmic time due to tree height",
    "O(n) — linear scan through nodes",
    "O(n log n) — combined traversal and comparison",
  ],
  correct: 1,
}));

export const liveStudents = [
  { id: "s1", name: "Alex Johnson", status: "active", warnings: 0 },
  { id: "s2", name: "Maria Garcia", status: "active", warnings: 1 },
  { id: "s3", name: "James Chen", status: "warning", warnings: 3 },
  { id: "s4", name: "Priya Patel", status: "active", warnings: 0 },
  { id: "s5", name: "Omar Hassan", status: "flagged", warnings: 5 },
  { id: "s6", name: "Sofia Rossi", status: "active", warnings: 0 },
];

export const usersList = [
  { id: "u1", name: "Alex Johnson", email: "alex@school.edu", role: "student", status: "active" },
  { id: "u2", name: "Dr. Sarah Kim", email: "skim@school.edu", role: "teacher", status: "active" },
  { id: "u3", name: "Maria Garcia", email: "maria@school.edu", role: "student", status: "active" },
  { id: "u4", name: "Prof. David Lee", email: "dlee@school.edu", role: "teacher", status: "active" },
  { id: "u5", name: "Admin User", email: "admin@school.edu", role: "admin", status: "active" },
  { id: "u6", name: "James Chen", email: "james@school.edu", role: "student", status: "suspended" },
];
