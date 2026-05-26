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
  { id: "e1", title: "Algorithms — University MCQ Set", subject: "Algorithms", duration: 90, questions: 40, date: "2026-06-02", status: "upcoming" },
  { id: "e2", title: "Database Systems — University MCQ Set", subject: "DBMS", duration: 75, questions: 35, date: "2026-05-25", status: "ongoing" },
  { id: "e3", title: "Operating Systems — University MCQ Set", subject: "Operating Systems", duration: 120, questions: 50, date: "2026-05-10", status: "completed", score: 87 },
  { id: "e4", title: "Computer Networks — University MCQ Set", subject: "Computer Networks", duration: 75, questions: 35, date: "2026-05-08", status: "completed", score: 92 },
  { id: "e5", title: "Machine Learning — University MCQ Set", subject: "Machine Learning", duration: 90, questions: 40, date: "2026-04-28", status: "completed", score: 78 },
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

export type DemoQuestion = {
  id: number;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export const examQuestions: DemoQuestion[] = [
  {
    id: 1,
    subject: "Algorithms",
    difficulty: "Medium",
    question: "Which algorithm guarantees the shortest path in a weighted graph without negative cycles?",
    options: ["Depth First Search", "Bellman-Ford Algorithm", "Prim’s Algorithm", "Binary Search"],
    correct: 1,
    explanation: "Bellman-Ford supports negative edge weights and computes shortest paths correctly when no negative cycle exists.",
  },
  {
    id: 2,
    subject: "Data Structures",
    difficulty: "Easy",
    question: "Which data structure is most suitable for implementing recursive function calls?",
    options: ["Queue", "Stack", "Heap", "Graph"],
    correct: 1,
    explanation: "Function calls follow last-in, first-out behavior, which is exactly how a stack works.",
  },
  {
    id: 3,
    subject: "DBMS",
    difficulty: "Medium",
    question: "Which normal form removes partial dependency on a composite key?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correct: 1,
    explanation: "Second Normal Form eliminates partial dependency by ensuring every non-key attribute depends on the whole key.",
  },
  {
    id: 4,
    subject: "Operating Systems",
    difficulty: "Hard",
    question: "Which condition is not a necessary condition for deadlock?",
    options: ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
    correct: 2,
    explanation: "Deadlock requires the absence of preemption; preemption itself is not one of the required conditions.",
  },
  {
    id: 5,
    subject: "Computer Networks",
    difficulty: "Easy",
    question: "Which protocol provides reliable, connection-oriented transport?",
    options: ["UDP", "TCP", "ICMP", "ARP"],
    correct: 1,
    explanation: "TCP ensures reliable delivery using acknowledgements, sequencing, and retransmissions.",
  },
  {
    id: 6,
    subject: "Software Engineering",
    difficulty: "Medium",
    question: "Which process model is best suited for iterative risk analysis?",
    options: ["Waterfall", "Spiral", "Code-and-fix", "Big bang"],
    correct: 1,
    explanation: "The Spiral model is built around repeated risk evaluation and refinement.",
  },
  {
    id: 7,
    subject: "Artificial Intelligence",
    difficulty: "Medium",
    question: "Which search strategy uses a heuristic to guide exploration toward the goal?",
    options: ["Breadth First Search", "A* search", "Bubble sort", "Linear search"],
    correct: 1,
    explanation: "A* uses both path cost and heuristic estimate to prioritize promising states.",
  },
  {
    id: 8,
    subject: "Machine Learning",
    difficulty: "Hard",
    question: "What is overfitting in machine learning?",
    options: ["Poor training accuracy", "Good training but poor test performance", "No use of labels", "Using too many GPUs"],
    correct: 1,
    explanation: "Overfitting happens when a model memorizes training data and fails to generalize to unseen examples.",
  },
  {
    id: 9,
    subject: "Compiler Design",
    difficulty: "Medium",
    question: "Which compiler phase converts a character stream into tokens?",
    options: ["Parsing", "Lexical analysis", "Code generation", "Optimization"],
    correct: 1,
    explanation: "Lexical analysis identifies and groups characters into tokens before parsing starts.",
  },
  {
    id: 10,
    subject: "Cyber Security",
    difficulty: "Medium",
    question: "Which attack is best prevented by using prepared statements?",
    options: ["Phishing", "SQL injection", "Sniffing", "DDoS"],
    correct: 1,
    explanation: "Prepared statements separate SQL code from user input, blocking injection attempts.",
  },
  {
    id: 11,
    subject: "OOP",
    difficulty: "Easy",
    question: "Which OOP principle allows a class to hide internal state and expose controlled access?",
    options: ["Polymorphism", "Encapsulation", "Inheritance", "Overloading"],
    correct: 1,
    explanation: "Encapsulation protects object state by restricting direct access to internal data.",
  },
  {
    id: 12,
    subject: "Web Development",
    difficulty: "Medium",
    question: "What is the main purpose of CORS?",
    options: ["Style components", "Control cross-origin resource sharing in browsers", "Store sessions on the server", "Compress HTTP payloads"],
    correct: 1,
    explanation: "CORS defines which origins are allowed to access browser resources across domains.",
  },
  {
    id: 13,
    subject: "Algorithms",
    difficulty: "Medium",
    question: "What is the worst-case time complexity of binary search on a sorted array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correct: 1,
    explanation: "Binary search halves the search interval each step, so the complexity is logarithmic.",
  },
  {
    id: 14,
    subject: "DBMS",
    difficulty: "Hard",
    question: "Which ACID property ensures a transaction leaves the database in a valid state?",
    options: ["Atomicity", "Consistency", "Isolation", "Durability"],
    correct: 1,
    explanation: "Consistency ensures database rules and constraints remain satisfied after each committed transaction.",
  },
  {
    id: 15,
    subject: "Computer Networks",
    difficulty: "Hard",
    question: "Which routing protocol is commonly used within an autonomous system?",
    options: ["BGP", "OSPF", "FTP", "SMTP"],
    correct: 1,
    explanation: "OSPF is an interior gateway protocol designed for routing inside a single autonomous system.",
  },
];

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
