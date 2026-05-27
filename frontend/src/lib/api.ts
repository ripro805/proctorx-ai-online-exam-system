export type Role = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone_number?: string;
}

export type ExamAnswerPayload = {
  question_id: number;
  choice_id?: number;
  answer_text?: string;
  answer_image?: string;
  answer_data?: Record<string, unknown>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";

const ACCESS_KEY = "proctorx_access";
const REFRESH_KEY = "proctorx_refresh";
const USER_KEY = "proctorx_user";

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredAccessToken() {
  return getAccessToken();
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function setStoredUser(user: AuthUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function refreshTokens() {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.access) {
    setTokens(data.access, refresh);
    return data.access as string;
  }
  return null;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      const retry = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
      if (!retry.ok) {
        const text = await retry.text();
        const err: any = new Error(text || `Request failed: ${retry.status}`);
        err.status = retry.status;
        throw err;
      }
      return retry.json();
    }
  }
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (data?.access && data?.refresh) {
    setTokens(data.access, data.refresh);
  }
  const user: AuthUser = {
    id: String(data.user_id),
    name: data.name ?? data.email?.split("@")[0],
    email: data.email,
    role: data.role,
  };
  setStoredUser(user);
  return user;
}

export async function register(name: string, email: string, password: string) {
  await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return login(email, password);
}

export async function logout() {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // ignore logout failures
    }
  }
  clearAuthStorage();
}

export async function getProfile() {
  return apiFetch("/auth/profile/");
}

export async function updateProfile(payload: Record<string, unknown>) {
  return apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify(payload) });
}

export async function getStudentDashboard() {
  return apiFetch("/dashboard/student/");
}

export async function getStudentExams() {
  return apiFetch("/student/exams/");
}

export async function getStudentResultsOverview() {
  return apiFetch("/student/results/overview/");
}

export async function getStudentNotifications() {
  return apiFetch("/notifications/");
}

export async function getTeacherSummary() {
  return apiFetch("/teacher/summary/");
}

export async function getTeacherAnalytics() {
  return apiFetch("/teacher/analytics/");
}

export async function getTeacherExams() {
  return apiFetch("/teacher/exams/");
}

export async function getTeacherStudents() {
  return apiFetch("/teacher/students/");
}

export async function getTeacherResults() {
  return apiFetch("/teacher/results/");
}

export async function getTeacherAiAnalytics() {
  return apiFetch('/ai/teacher-analytics/');
}

export async function getTeacherReports() {
  return apiFetch("/teacher/reports/");
}

export async function getTeacherActiveStudents(examId?: string) {
  const qs = examId ? `?exam_id=${encodeURIComponent(examId)}` : "";
  return apiFetch(`/proctoring/teacher/active-students/${qs}`);
}

export async function getAdminSummary() {
  return apiFetch("/admin/summary/");
}

export async function getAdminAnalytics() {
  return apiFetch("/admin/analytics/");
}

export async function getAdminUsers() {
  return apiFetch("/admin/users/");
}

export async function getAdminTeachers() {
  return apiFetch("/admin/teachers/");
}

export async function updateUserRole(userId: string, role: Role) {
  return apiFetch(`/auth/users/${userId}/role/`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export async function getAdminProctoring() {
  return apiFetch("/admin/proctoring/");
}

export async function getAdminSecurityAlerts() {
  return apiFetch("/admin/security-alerts/");
}

export async function getAdminReports() {
  return apiFetch("/admin/reports/");
}

export async function getSystemSettings() {
  return apiFetch("/admin/settings/");
}

export async function updateSystemSettings(payload: Record<string, unknown>) {
  return apiFetch("/admin/settings/", { method: "PUT", body: JSON.stringify(payload) });
}

export async function getExam(examId: string) {
  return apiFetch(`/exams/${examId}/`);
}

export async function getAllExams() {
  return apiFetch("/exams/");
}

export async function createExam(payload: Record<string, unknown>) {
  return apiFetch("/exams/", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateExam(examId: string, payload: Record<string, unknown>) {
  return apiFetch(`/exams/${examId}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteExam(examId: string) {
  return apiFetch(`/exams/${examId}/`, { method: "DELETE" });
}

export async function getQuestions(params?: { subject?: string; examId?: string; questionType?: string; bank?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.subject) qs.set("subject", params.subject);
  if (params?.examId) qs.set("exam_id", params.examId);
  if (params?.questionType) qs.set("question_type", params.questionType);
  if (typeof params?.bank === "boolean") qs.set("bank", params.bank ? "true" : "false");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/questions/${suffix}`);
}

export async function createQuestion(payload: Record<string, unknown>) {
  return apiFetch("/questions/", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateQuestion(questionId: string, payload: Record<string, unknown>) {
  return apiFetch(`/questions/${questionId}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function getTeacherExamsBySubject(subject?: string) {
  const qs = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return apiFetch(`/exams/${qs}`);
}

export async function startExam(examId: string) {
  return apiFetch("/exam/start/", { method: "POST", body: JSON.stringify({ exam_id: examId }) });
}

export async function submitExam(examId: string, answers: ExamAnswerPayload[]) {
  return apiFetch("/exam/submit/", { method: "POST", body: JSON.stringify({ exam_id: examId, answers }) });
}

export async function saveExamProgress(examId: string, answers: ExamAnswerPayload[]) {
  return apiFetch("/exam/save/", { method: "POST", body: JSON.stringify({ exam_id: examId, answers }) });
}

export async function getExamProgress(examId: string) {
  return apiFetch(`/exam/progress/?exam_id=${encodeURIComponent(examId)}`);
}

export async function getAiConversations() {
  return apiFetch("/ai/chat/");
}

export async function getAiConversation(conversationId: string) {
  return apiFetch(`/ai/chat/?conversation_id=${encodeURIComponent(conversationId)}`);
}

export async function sendAiChatMessage(payload: { message: string; conversationId?: string; subject?: string; action?: "chat" | "voice" }) {
  return apiFetch("/ai/chat/", {
    method: "POST",
    body: JSON.stringify({
      message: payload.message,
      conversation_id: payload.conversationId,
      subject: payload.subject,
      action: payload.action ?? "chat",
    }),
  });
}

export async function getAiStudyPlans() {
  return apiFetch("/ai/study-plan/");
}

export async function generateAiStudyPlan(payload: {
  subject: string;
  examId?: string;
  studyHoursPerDay?: number;
  difficultyLevel?: string;
  learningPace?: string;
  completedTopics?: string;
}) {
  return apiFetch("/ai/study-plan/", {
    method: "POST",
    body: JSON.stringify({
      subject: payload.subject,
      exam_id: payload.examId,
      study_hours_per_day: payload.studyHoursPerDay,
      difficulty_level: payload.difficultyLevel,
      learning_pace: payload.learningPace,
      completed_topics: payload.completedTopics,
    }),
  });
}

export async function generateAiQuiz(payload: { topic: string; difficulty: string; count: number }) {
  return apiFetch("/ai/generate-quiz/", {
    method: "POST",
    body: JSON.stringify({ topic: payload.topic, difficulty: payload.difficulty, question_count: payload.count }),
  });
}

export async function submitAiQuiz(payload: { quiz_id: number | string; answers: Record<string, string> }) {
  return apiFetch('/ai/submit-quiz/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getAiPerformanceAnalysis() {
  return apiFetch("/ai/performance-analysis/");
}

export async function logProctorEvent(payload: { examId: string; eventType: string; message?: string }) {
  return apiFetch("/proctoring/log/", {
    method: "POST",
    body: JSON.stringify({ exam: payload.examId, event_type: payload.eventType, message: payload.message }),
  });
}

export async function sendProctorFrame(examId: string, frame: string) {
  return apiFetch("/proctoring/frame/", {
    method: "POST",
    body: JSON.stringify({ exam: examId, frame }),
  });
}

export async function getProctorLogs() {
  return apiFetch("/proctoring/logs/");
}

export async function getMyProctorLogs() {
  return apiFetch("/proctoring/my-logs/");
}

export function wsUrl(path: string, token?: string) {
  const base = WS_BASE_URL.replace(/\/$/, "");
  const suffix = token ? `${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : path;
  return `${base}${suffix}`;
}
