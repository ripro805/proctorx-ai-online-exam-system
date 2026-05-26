import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveAlertsFeed } from "@/components/proctoring/live-alerts-feed";
import { getTeacherSummary } from "@/lib/api";
import { useEffect, useState } from "react";
import { FileText, Activity, Users, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

export const Route = createFileRoute("/teacher/dashboard")({ component: TeacherDashboard });

function TeacherDashboard() {
  const [stats, setStats] = useState<any>({});
  const [violations, setViolations] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  useEffect(() => {
    getTeacherSummary().then((data) => {
      setStats(data ?? {});
      setViolations(data.violation_data ?? []);
      setTrend(data.performance_trend ?? []);
    }).catch(() => {
      setStats({});
      setViolations([]);
      setTrend([]);
    });
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

