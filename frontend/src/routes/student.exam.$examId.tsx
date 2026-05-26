import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getExam, getExamProgress, saveExamProgress, startExam, submitExam } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useProctoring, severityFor, messageFor } from "@/context/proctoring-context";
import { WebcamMonitor } from "@/components/proctoring/webcam-monitor";
import { useAntiCheat } from "@/components/proctoring/use-anti-cheat";
import {
  ShieldCheck, AlertTriangle, Clock, Maximize2, ChevronLeft, ChevronRight, Save, Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/student/exam/$examId")({ component: ExamPage });

function ExamPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const { examId } = Route.useParams();
  const [exam, setExam] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const { events, logEvent } = useProctoring();
  const studentId = user?.id ?? user?.email ?? "anon";
  const studentName = user?.name ?? "Anonymous";

  useEffect(() => { if (ready && !user) navigate({ to: "/login" }); }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getExam(examId);
        setExam(data);
        setQuestions(data.questions ?? []);
        const progress = await getExamProgress(examId).catch(() => null);
        if (progress?.answers) {
          const mapped: Record<number, number> = {};
          for (const item of progress.answers) {
            if (item?.question_id && item?.choice_id) {
              mapped[item.question_id] = item.choice_id;
            }
          }
          setAnswers(mapped);
        }
        const started = await startExam(examId).catch(() => null);
        if (started?.remaining_seconds) setTimeLeft(started.remaining_seconds);
        else if (data?.end_time) {
          const diff = Math.max(0, Math.floor((Date.parse(data.end_time) - Date.now()) / 1000));
          setTimeLeft(diff);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, user]);

  // Log exam start once
  useEffect(() => {
    if (!user) return;
    logEvent({
      studentId, studentName, examId,
      type: "EXAM_STARTED",
      severity: severityFor("EXAM_STARTED"),
      message: messageFor("EXAM_STARTED"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useAntiCheat({
    studentId, studentName, examId,
    enabled: !!user,
    onTabSwitch: () => {
      setWarnings((w) => w + 1);
      setShowWarning("Tab switch detected. This event has been logged for the proctor.");
    },
    onFullscreenExit: () => {
      setWarnings((w) => w + 1);
      setShowWarning("You exited fullscreen mode. Please return to fullscreen to continue.");
    },
  });

  // Bump local warning counter on any high-severity proctoring event for THIS student
  useEffect(() => {
    const latest = events[0];
    if (!latest) return;
    if (latest.studentId !== studentId) return;
    if (latest.severity === "HIGH" && latest.type === "MULTIPLE_FACES_DETECTED") {
      setWarnings((w) => w + 1);
      setShowWarning("Multiple faces detected in your webcam. Make sure you are alone.");
    }
  }, [events, studentId]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const q = questions[idx];
  const answered = Object.keys(answers).length;
  const goFullscreen = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };

  const myRecentEvents = events.filter((e) => e.studentId === studentId).slice(0, 4);

  useEffect(() => {
    if (!exam || !user) return;
    const id = setTimeout(() => {
      const payload = Object.entries(answers).map(([qid, cid]) => ({ question_id: Number(qid), choice_id: cid }));
      if (payload.length) saveExamProgress(examId, payload).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [answers, exam, examId, user]);

  if (!user || loading || !exam) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col select-none">
      <div className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{exam.title}</div>
            <div className="text-xs text-muted-foreground">{exam.subject ?? "General"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-success/40 text-success gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> AI Monitoring
          </Badge>
          <Badge variant="outline" className="gap-1"><Save className="h-3 w-3" /> Auto-saved</Badge>
          <Button size="sm" variant="ghost" onClick={goFullscreen}><Maximize2 className="h-4 w-4 mr-1" /> Fullscreen</Button>
          <div className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-mono font-bold",
            timeLeft < 300 ? "bg-destructive/20 text-destructive" : "bg-muted")}>
            <Clock className="h-4 w-4" />{mm}:{ss}
          </div>
          <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setSubmitOpen(true)}>
            <Send className="h-3 w-3 mr-1" /> Submit
          </Button>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] overflow-hidden">
        <aside className="border-r bg-card/50 p-3 overflow-y-auto hidden lg:block">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Questions</div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={cn("h-9 w-9 rounded-md text-xs font-medium border transition-all",
                  i === idx ? "border-primary bg-primary text-primary-foreground shadow-glow"
                    : answers[questions[i]?.id] !== undefined ? "border-success bg-success/20 text-success"
                    : "border-border hover:bg-muted")}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <Progress value={(answered / Math.max(questions.length, 1)) * 100} />
            <div className="text-muted-foreground">{answered}/{questions.length} answered</div>
          </div>
        </aside>
        <section className="overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto">
            <div className="text-xs text-muted-foreground mb-2">Question {idx + 1} of {questions.length}</div>
            <h2 className="text-xl md:text-2xl font-semibold mb-6">{q?.text}</h2>
            <div className="space-y-3">
              {q?.choices?.map((opt: any, i: number) => (
                <button key={opt.id} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                  className={cn("w-full text-left px-4 py-3 rounded-lg border transition-all",
                    answers[q.id] === opt.id ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/40 hover:bg-muted/40")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("h-6 w-6 rounded-full border flex items-center justify-center text-xs font-medium shrink-0",
                      answers[q.id] === opt.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span>{opt.text}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              {idx === questions.length - 1 ? (
                <Button className="gradient-primary text-primary-foreground" onClick={() => setSubmitOpen(true)}>Review & Submit</Button>
              ) : (
                <Button onClick={() => setIdx((i) => i + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
              )}
            </div>
          </div>
        </section>
        <aside className="border-l bg-card/50 p-4 overflow-y-auto space-y-4 hidden lg:block">
          <Card className="border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> Live webcam
              </div>
              <WebcamMonitor studentId={studentId} studentName={studentName} examId={examId} />
            </CardContent>
          </Card>
          <Card className={cn("border-border/60", warnings > 0 && "border-warning/40")}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                <AlertTriangle className={cn("h-3 w-3", warnings > 0 ? "text-warning" : "text-muted-foreground")} /> Warnings
              </div>
              <div className="text-2xl font-bold">{warnings}</div>
              <div className="text-xs text-muted-foreground">Max allowed: 3</div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-3 space-y-1.5">
              <div className="text-xs font-semibold mb-1">Recent activity</div>
              {myRecentEvents.length === 0 ? (
                <div className="text-xs text-muted-foreground">No events yet</div>
              ) : myRecentEvents.map((e) => (
                <div key={e.id} className="text-xs flex items-center gap-2">
                  <Badge className={cn("border-0 text-[10px] h-4",
                    e.severity === "HIGH" ? "bg-destructive/20 text-destructive"
                    : e.severity === "MEDIUM" ? "bg-warning/20 text-warning"
                    : "bg-muted text-muted-foreground")}>{e.severity}</Badge>
                  <span className="truncate">{e.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog open={!!showWarning} onOpenChange={() => setShowWarning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5" /> Warning</DialogTitle>
            <DialogDescription>{showWarning}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setShowWarning(null)}>I understand</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>
              You answered {answered} of {questions.length} questions. You will not be able to change answers after submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Continue exam</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => {
                const payload = Object.entries(answers).map(([qid, cid]) => ({ question_id: Number(qid), choice_id: cid }));
                submitExam(examId, payload).then(() => {
                  logEvent({
                    studentId, studentName, examId,
                    type: "EXAM_SUBMITTED",
                    severity: severityFor("EXAM_SUBMITTED"),
                    message: messageFor("EXAM_SUBMITTED"),
                  });
                  toast.success("Exam submitted successfully!");
                  navigate({ to: "/student/results" });
                }).catch(() => toast.error("Failed to submit exam"));
            }}>Submit now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
