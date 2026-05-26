import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAiPerformanceAnalysis, getStudentDashboard } from "@/lib/api";
import { useEffect, useState } from "react";
import { BookOpen, Clock, CheckCircle2, TrendingUp, Camera, ArrowRight, Sparkles, Brain, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/student/dashboard")({ component: StudentDashboard });

function StudentDashboard() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [ongoing, setOngoing] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    getStudentDashboard().then((data) => {
      setUpcoming(data.upcoming ?? []);
      setOngoing(data.ongoing ?? []);
      setCompleted(data.completed ?? []);
      setTrend(data.performance_trend ?? []);
    }).catch(() => {
      setUpcoming([]);
      setOngoing([]);
      setCompleted([]);
      setTrend([]);
    });
    getAiPerformanceAnalysis().then(setAnalysis).catch(() => setAnalysis(null));
  }, []);

  const avg = Math.round(completed.reduce((s, e) => s + (e.score ?? 0), 0) / Math.max(completed.length, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-muted-foreground">Here's an overview of your exam activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Upcoming" value={upcoming.length} icon={Clock} accent="primary" trend="Next in 2 days" />
        <StatCard title="Ongoing" value={ongoing.length} icon={BookOpen} accent="warning" trend="Active right now" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle2} accent="success" trend="This term" />
        <StatCard title="Average Score" value={`${avg}%`} icon={TrendingUp} accent="primary" trend="↑ 4% from last month" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader><CardTitle>Performance trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ fill: "var(--primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4 text-success" /> AI Monitoring</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Integrity score</span><span className="font-medium">98%</span></div>
              <Progress value={98} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Identity verified</span><Badge className="bg-success/20 text-success border-0">Active</Badge></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span>Device check</span><Badge className="bg-success/20 text-success border-0">Passed</Badge></div>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Webcam & microphone ready. AI proctor will activate when you begin an exam.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> AI Tutor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Ask questions, get explanations, and review weak topics in real time.</p>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/student/ai-tutor">Open tutor</Link></Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4" /> Weak subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(analysis?.weak_subjects ?? []).slice(0, 3).map((item: any) => (
              <div key={item.subject} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                <span>{item.subject}</span>
                <span className="text-muted-foreground">{item.average}%</span>
              </div>
            ))}
            {(analysis?.weak_subjects ?? []).length === 0 && <p className="text-muted-foreground">No weak-subject analysis yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4" /> AI guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{analysis?.average_score ? `Average score ${analysis.average_score}%` : "Get a personalized improvement summary from the AI engine."}</p>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/student/study-planner">Build study plan</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming exams</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/student/exams">View all <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/40">
              <div>
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.subject} · {e.duration} min · {e.date}</div>
              </div>
              <Badge variant="outline" className="capitalize">{e.status}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No upcoming exams.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
