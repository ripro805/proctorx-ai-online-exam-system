// jsPDF uses the browser globals; import dynamically in the download function to avoid SSR/runtime errors

export interface StudyPlanScheduleBlock {
  time?: string;
  title?: string;
  duration?: string;
  method?: string;
  outcome?: string;
}

export interface StudyPlanWeeklyBlock {
  day?: string;
  theme?: string;
  tasks?: string[];
  checkpoint?: string;
}

export interface StudyPlanPriority {
  subject?: string;
  priority?: string;
  allocation?: string;
  reason?: string;
}

export interface StudyPlanRevisionPhase {
  phase?: string;
  focus?: string;
  actions?: string[];
}

export interface StudyPlanMockTest {
  label?: string;
  cadence?: string;
  duration?: string;
  format?: string;
  objective?: string;
}

export interface StudyPlanCountdownItem {
  window?: string;
  actions?: string[];
}

export interface StudyPlanData {
  title: string;
  student_name: string;
  exam_title: string;
  exam_date: string;
  introduction: string;
  study_goals: string[];
  daily_schedule: StudyPlanScheduleBlock[];
  weekly_strategy: StudyPlanWeeklyBlock[];
  subject_priorities: StudyPlanPriority[];
  weak_area_focus: { summary: string; topics: string[]; strategies: string[] };
  revision_timeline: StudyPlanRevisionPhase[];
  mock_test_schedule: StudyPlanMockTest[];
  productivity_tips: string[];
  motivation: { headline: string; message: string };
  sleep_break_recommendations: { sleep_hours: number | string; break_pattern: string; notes: string };
  final_revision_countdown: StudyPlanCountdownItem[];
  progress_overview: Record<string, unknown>;
  calendar_view: { day: string; focus: string; style?: string }[];
  provider?: string;
  fallback?: boolean;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);
const asText = (value: unknown, fallback = "") => (typeof value === "string" ? value : value == null ? fallback : String(value));

export function normalizeStudyPlan(raw: any): StudyPlanData {
  const goals = asArray<string>(raw?.study_goals ?? raw?.goals ?? raw?.quick_wins ?? raw?.recommendations).filter(Boolean);
  const schedule = asArray<any>(raw?.daily_schedule ?? raw?.daily_routine ?? raw?.schedule).map((item) => ({
    time: asText(item?.time ?? item?.slot),
    title: asText(item?.title ?? item?.task ?? item?.activity ?? item),
    duration: asText(item?.duration),
    method: asText(item?.method ?? item?.technique),
    outcome: asText(item?.outcome),
  }));
  const weekly = asArray<any>(raw?.weekly_strategy ?? raw?.weekly_plan ?? raw?.weekly_schedule).map((item) => ({
    day: asText(item?.day),
    theme: asText(item?.theme ?? item?.focus ?? item?.title),
    tasks: asArray<string>(item?.tasks ?? item?.actions ?? item?.items).map((entry) => asText(entry)).filter(Boolean),
    checkpoint: asText(item?.checkpoint),
  }));
  const priorities = asArray<any>(raw?.subject_priorities ?? raw?.priorities ?? raw?.weak_subjects).map((item) => ({
    subject: asText(item?.subject),
    priority: asText(item?.priority ?? item?.level),
    allocation: asText(item?.allocation ?? item?.weight),
    reason: asText(item?.reason ?? `Focus on ${asText(item?.subject)}`),
  }));
  const weakArea = raw?.weak_area_focus ?? raw?.weak_area_improvement ?? {};
  const revision = asArray<any>(raw?.revision_timeline ?? raw?.timeline).map((item) => ({
    phase: asText(item?.phase),
    focus: asText(item?.focus ?? item?.summary),
    actions: asArray<string>(item?.actions ?? item?.steps).map((entry) => asText(entry)).filter(Boolean),
  }));
  const mocks = asArray<any>(raw?.mock_test_schedule ?? raw?.mock_tests).map((item) => ({
    label: asText(item?.label ?? item?.name),
    cadence: asText(item?.cadence ?? item?.schedule),
    duration: asText(item?.duration),
    format: asText(item?.format),
    objective: asText(item?.objective),
  }));
  const countdown = asArray<any>(raw?.final_revision_countdown ?? raw?.countdown).map((item) => ({
    window: asText(item?.window ?? item?.phase),
    actions: asArray<string>(item?.actions ?? item?.steps).map((entry) => asText(entry)).filter(Boolean),
  }));
  const calendar = asArray<any>(raw?.calendar_view).map((item) => ({
    day: asText(item?.day),
    focus: asText(item?.focus),
    style: asText(item?.style),
  }));

  return {
    title: asText(raw?.title, `🎯 Personalized Study Plan for ${asText(raw?.subject, "your subject")}`),
    student_name: asText(raw?.student_name, "Student"),
    exam_title: asText(raw?.exam_title, "Upcoming exam"),
    exam_date: asText(raw?.exam_date, "Soon"),
    introduction: asText(raw?.introduction, "Your AI study roadmap is ready."),
    study_goals: goals.length ? goals : ["Strengthen weak areas", "Revise daily", "Practice under time pressure"],
    daily_schedule: schedule.length ? schedule : [{ time: "Morning", title: "Revision block", duration: "90 min", method: "Active recall", outcome: "Build confidence" }],
    weekly_strategy: weekly,
    subject_priorities: priorities.length ? priorities : [{ subject: asText(raw?.subject, "General"), priority: "High", allocation: "40%", reason: "Primary focus area" }],
    weak_area_focus: {
      summary: asText(weakArea?.summary, "Focus on the lowest-score topics with repeated retrieval and practice."),
      topics: asArray<string>(weakArea?.topics ?? raw?.weak_subjects).map((entry: any) => asText(entry?.subject ?? entry)).filter(Boolean),
      strategies: asArray<string>(weakArea?.strategies ?? weakArea?.tips).map((entry) => asText(entry)).filter(Boolean),
    },
    revision_timeline: revision.length ? revision : [{ phase: "Final week", focus: "Full revision only", actions: ["No new topics", "Daily mocks", "Nightly recap"] }],
    mock_test_schedule: mocks.length ? mocks : [{ label: "Mock Test", cadence: "Weekly", duration: "Full duration", format: "Timed", objective: "Measure readiness" }],
    productivity_tips: asArray<string>(raw?.productivity_tips ?? raw?.tips).map((entry) => asText(entry)).filter(Boolean),
    motivation: {
      headline: asText(raw?.motivation?.headline, "Stay consistent — momentum beats perfection."),
      message: asText(raw?.motivation?.message, "Every focused session compounds into a better score."),
    },
    sleep_break_recommendations: {
      sleep_hours: raw?.sleep_break_recommendations?.sleep_hours ?? 7,
      break_pattern: asText(raw?.sleep_break_recommendations?.break_pattern, "25-30 minute focus blocks with short resets"),
      notes: asText(raw?.sleep_break_recommendations?.notes, "Protect sleep before exam day and keep breaks intentional."),
    },
    final_revision_countdown: countdown.length ? countdown : [{ window: "7 days out", actions: ["Review only high-yield notes", "Run a daily mock"] }],
    progress_overview: raw?.progress_overview ?? {},
    calendar_view: calendar.length ? calendar : [
      { day: "Mon", focus: "Deep work", style: "Focus" },
      { day: "Tue", focus: "Practice", style: "Practice" },
      { day: "Wed", focus: "Revision", style: "Recovery" },
      { day: "Thu", focus: "Timed work", style: "Speed" },
      { day: "Fri", focus: "Mock test", style: "Exam mode" },
      { day: "Sat", focus: "Review mistakes", style: "Fix" },
      { day: "Sun", focus: "Light reset", style: "Recharge" },
    ],
    provider: raw?.provider,
    fallback: raw?.fallback,
  };
}

export function studyPlanToPlainText(plan: StudyPlanData) {
  const lines: string[] = [];
  const push = (value = "") => lines.push(value);
  const bullet = (items: string[]) => items.filter(Boolean).map((item) => `- ${item}`);

  push(plan.title);
  push(`Student: ${plan.student_name}`);
  push(`Exam: ${plan.exam_title} (${plan.exam_date})`);
  push("");
  push("Introduction");
  push(plan.introduction);
  push("");
  push("Study Goals");
  lines.push(...bullet(plan.study_goals));
  push("");
  push("Daily Schedule");
  plan.daily_schedule.forEach((item) => {
    push(`- ${item.time ?? ""} | ${item.title ?? ""} | ${item.duration ?? ""}`.trim());
    if (item.method) push(`  Method: ${item.method}`);
    if (item.outcome) push(`  Outcome: ${item.outcome}`);
  });
  push("");
  push("Weak Area Focus");
  push(plan.weak_area_focus.summary);
  lines.push(...bullet(plan.weak_area_focus.topics.map((topic) => `Topic: ${topic}`)));
  push("");
  push("Motivation");
  push(`${plan.motivation.headline} ${plan.motivation.message}`.trim());
  return lines.join("\n");
}

export async function downloadStudyPlanPdf(plan: StudyPlanData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height = 18) => {
    if (y + height > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text: string, size = 11, bold = false, color: [number, number, number] = [35, 41, 55]) => {
    ensureSpace(size + 8);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (size + 4);
  };

  const section = (title: string, items: string[]) => {
    write(title, 15, true, [17, 24, 39]);
    items.forEach((item) => write(`• ${item}`, 10));
    y += 6;
  };

  write(plan.title, 20, true, [79, 70, 229]);
  write(`Student: ${plan.student_name}`, 11);
  write(`Exam: ${plan.exam_title} — ${plan.exam_date}`, 11);
  y += 8;

  section("Introduction", [plan.introduction]);
  section("Study Goals", plan.study_goals);
  section("Daily Schedule", plan.daily_schedule.map((item) => `${item.time ?? ""} | ${item.title ?? ""} | ${item.duration ?? ""}`.trim()));
  section("Weak Area Focus", [plan.weak_area_focus.summary, ...plan.weak_area_focus.topics.map((topic) => `Topic: ${topic}`)]);
  section("Motivation", [plan.motivation.headline, plan.motivation.message]);

  doc.save(`${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "study-plan"}.pdf`);
}
