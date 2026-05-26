import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveAlertsFeed } from "@/components/proctoring/live-alerts-feed";
import { getTeacherSummary, getTeacherAiAnalytics } from "@/lib/api";
import { useEffect, useState } from "react";
import { FileText, Activity, Users, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

export const Route = createFileRoute("/teacher/dashboard")({ component: TeacherDashboard });

function TeacherDashboard() {
  const [stats, setStats] = useState<any>({});
  const [violations, setViolations] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const data = await getTeacherSummary();
        setStats(data ?? {});
        setViolations(data.violation_data ?? []);
        setTrend(data.performance_trend ?? []);
      } catch (err: any) {
        // show a clearer error when access is denied
        if (err?.status === 403) {
          // redirect to login for re-auth or inform the user
          // keep UX friendly: show empty and a toast
          // we can't import toast here without adding it, but keep minimal: set empty state
          setStats({});
          setViolations([]);
          setTrend([]);
          setAiAnalytics(null);
          return;
        }
        setStats({});
        setViolations([]);
        setTrend([]);
      }
      try {
        const data = await getTeacherAiAnalytics();
        setAiAnalytics(data);
      } catch {
        setAiAnalytics(null);
      }
    })();
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Educator overview</h1>
        <p className="text-muted-foreground">Manage exams, monitor students, and review results.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Exams" value={stats.total_exams ?? 0} icon={FileText} accent="primary" trend="All time" />
        <StatCard title="Active Exams" value={stats.active_exams ?? 0} icon={Activity} accent="warning" trend="In progress" />
        <StatCard title="Students" value={(stats.students ?? 0).toLocaleString?.() ?? stats.students ?? 0} icon={Users} accent="success" trend="Enrolled" />
        <StatCard title="Violations" value={stats.violations ?? 0} icon={ShieldAlert} accent="destructive" trend="Last 7 days" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader><CardTitle>AI conversations</CardTitle></CardHeader>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <div className="text-lg font-medium">{aiAnalytics?.total_conversations ?? 0}</div>
            <div className="text-xs">Conversations (all time)</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <div className="text-lg font-medium">{aiAnalytics?.total_messages ?? 0}</div>
            <div className="text-xs">Total messages</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Avg msg / convo</CardTitle></CardHeader>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <div className="text-lg font-medium">{aiAnalytics?.avg_messages_per_conversation ?? 0}</div>
            <div className="text-xs">Average messages per conversation</div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Recent AI activity</CardTitle></CardHeader>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              {(aiAnalytics?.recent_activity ?? []).slice(0,3).map((r:any)=> (
                <div key={r.id} className="text-xs">{r.student__name}: {r.title || r.subject || 'chat'}</div>
              ))}
              {(aiAnalytics?.recent_activity ?? []).length===0 && <div className="text-xs text-muted-foreground">No AI activity yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle>Weekly violations</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violations}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--destructive)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Average cohort performance</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="cohort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="score" stroke="var(--primary)" fill="url(#cohort)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <LiveAlertsFeed />
    </div>
  );
}

