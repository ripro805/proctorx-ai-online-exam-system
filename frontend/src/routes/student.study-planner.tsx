import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Sparkles } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { studentNav } from "@/data/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { generateAiStudyPlan, getAiPerformanceAnalysis } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/student/study-planner")({ component: StudyPlannerPage });

function StudyPlannerPage() {
  const [subject, setSubject] = useState("Computer Science");
  const [plan, setPlan] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAiPerformanceAnalysis().then(setAnalysis).catch(() => setAnalysis(null));
  }, []);

  const createPlan = async () => {
    setLoading(true);
    try {
      const res = await generateAiStudyPlan({ subject });
      setPlan(res.plan?.plan_data ?? res.generated ?? res.plan);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create study plan");
    } finally {
      setLoading(false);
    }
  };

  const weak = analysis?.weak_subjects ?? [];
  const recommendations = analysis?.recommendations ?? [];

  return (
    <DashboardLayout role="student" items={studentNav} label="Student Portal">
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
                    <p className="text-sm text-muted-foreground">{plan.revision_strategy ?? plan.strategy ?? "Focus on weak topics first."}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Daily schedule</div>
                    <div className="space-y-2">
                      {(plan.daily_schedule ?? plan.schedule ?? []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm">
                          <span className="font-medium">{item.time ?? item.slot ?? `Block ${idx + 1}`}</span>
                          <span className="text-muted-foreground">{item.task ?? item.activity ?? item}</span>
                        </div>
                      ))}
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
    </DashboardLayout>
  );
}
