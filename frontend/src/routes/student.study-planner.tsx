import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { Award, BookOpen, ChevronRight, Copy, Download, Flame, RefreshCw, Save, Target, TimerReset, TrendingUp, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateAiStudyPlan, getAiPerformanceAnalysis, getStudentExams } from "@/lib/api";
import { downloadStudyPlanPdf, normalizeStudyPlan, studyPlanToPlainText, type StudyPlanData } from "@/lib/study-plan";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/student/study-planner")({ component: StudyPlannerPage });

type StudentExam = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questions: number;
  date: string;
  status: "upcoming" | "ongoing" | "completed";
};

type PerformanceAnalysis = {
  average_score?: number;
  weak_subjects?: Array<{ subject: string; average: number; attempts?: number }>;
  recommendations?: string[];
  upcoming_exams?: Array<{ id: string | number; title: string; subject: string; date: string }>;
};

const STORAGE_KEY_PREFIX = "proctorx-study-plan:";

function getProgressFromPriority(priority?: string) {
  const value = (priority ?? "").toLowerCase();
  if (value.includes("very")) return 95;
  if (value.includes("high")) return 78;
  if (value.includes("medium")) return 55;
  if (value.includes("low")) return 28;
  return 50;
}

function formatCountdown(exam?: StudentExam | null) {
  if (!exam?.date) return "Choose an exam to unlock the exam countdown.";
  return `Target exam date: ${exam.date}`;
}

function buildCalendarCells(plan?: StudyPlanData) {
  return plan?.calendar_view ?? [];
}

function StudyPlannerPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("Computer Science");
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(3);
  const [difficultyLevel, setDifficultyLevel] = useState("balanced");
  const [learningPace, setLearningPace] = useState("steady");
  const [completedTopics, setCompletedTopics] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [plan, setPlan] = useState<StudyPlanData | null>(null);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getAiPerformanceAnalysis().catch(() => null),
      getStudentExams().catch(() => ({ exams: [] })),
    ]).then(([analysisData, examsData]) => {
      setAnalysis((analysisData ?? null) as PerformanceAnalysis | null);
      const rows = (examsData?.exams ?? []) as StudentExam[];
      setExams(rows);
      const preferred = rows.find((exam) => exam.status === "upcoming") ?? rows[0];
      if (preferred) setSelectedExamId(String(preferred.id));
    });
  }, []);

  const selectedExam = useMemo(() => exams.find((exam) => String(exam.id) === selectedExamId) ?? null, [exams, selectedExamId]);

  const createPlan = async () => {
    setLoading(true);
    try {
      const res = await generateAiStudyPlan({
        subject,
        examId: selectedExamId || undefined,
        studyHoursPerDay,
        difficultyLevel,
        learningPace,
        completedTopics,
      });
      const raw = res.plan?.plan_data ?? res.generated ?? res.plan;
      setPlan(normalizeStudyPlan(raw));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${user?.id ?? "guest"}`,
          JSON.stringify({ updatedAt: new Date().toISOString(), plan: raw, settings: { subject, selectedExamId, studyHoursPerDay, difficultyLevel, learningPace, completedTopics } }),
        );
      }
      toast.success("Premium study plan generated");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create study plan");
    } finally {
      setLoading(false);
    }
  };

  function renderText(value: any) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") return value?.title ?? value?.text ?? JSON.stringify(value);
    return String(value);
  }

  const copyPlan = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(studyPlanToPlainText(plan));
    toast.success("Plan copied to clipboard");
  };

  const savePlan = async () => {
    if (!plan || typeof window === "undefined") return;
    setSaving(true);
    try {
      const key = `${STORAGE_KEY_PREFIX}${user?.id ?? "guest"}`;
      const existing = window.localStorage.getItem(key);
      const snapshot = existing ? JSON.parse(existing) : {};
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...snapshot,
          updatedAt: new Date().toISOString(),
          plan,
          settings: { subject, selectedExamId, studyHoursPerDay, difficultyLevel, learningPace, completedTopics },
        }),
      );
      toast.success("Study plan saved locally");
    } catch {
      toast.error("Could not save the study plan");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    if (!plan) return;
    downloadStudyPlanPdf(plan);
    toast.success("PDF download started");
  };

  const regeneratePlan = () => void createPlan();

  const weak = analysis?.weak_subjects ?? [];
  const recommendations = analysis?.recommendations ?? [];
  const selectedWeak = weak.slice(0, 3);
  const calendarCells = buildCalendarCells(plan);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Study Planner</h1>
        <p className="text-muted-foreground">Generate a daily routine, revision schedule, and smart recommendations.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Generate study plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject or topic" />
              <Button className="gradient-primary text-primary-foreground" onClick={() => void createPlan()} disabled={loading}>
                {loading ? "Creating…" : "Generate plan"}
              </Button>
            </div>

            {plan ? (
              <div className="space-y-4 rounded-2xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Today's focus</div>
                    <div className="text-xs text-muted-foreground">Personalized for {subject}</div>
                  </div>
                  <Badge variant="outline">AI generated</Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Revision strategy</div>
                  <p className="text-sm text-muted-foreground">{renderText(plan.revision_strategy ?? plan.strategy ?? "Focus on weak topics first.")}</p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Daily schedule</div>
                    <div className="space-y-2">
                    {(plan.daily_schedule ?? plan.schedule ?? []).map((item: any, idx: number) => {
                      const time = item?.time ?? item?.slot ?? `Block ${idx + 1}`;
                      const content = item?.task ?? item?.activity ?? item;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                          <span className="font-medium">{renderText(time)}</span>
                          <span className="text-muted-foreground">{renderText(content)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Generate a plan to see a tailored daily study routine.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" /> Weak subjects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weak.length ? weak.map((item: any) => (
                <div key={item.subject} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.subject}</span>
                    <span>{item.average}%</span>
                  </div>
                  <Progress value={Math.max(8, Math.min(100, item.average ?? 0))} className="mt-2" />
                </div>
              )) : <p className="text-sm text-muted-foreground">No analytics yet.</p>}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> Smart recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.length ? recommendations.map((rec: string) => (
                <div key={rec} className="flex items-start gap-2 rounded-xl border border-border/60 p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <span>{rec}</span>
                </div>
              )) : <p className="text-sm text-muted-foreground">Generate analysis to see recommendations.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
