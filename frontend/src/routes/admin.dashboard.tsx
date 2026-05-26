import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSummary } from "@/lib/api";
import { useEffect, useState } from "react";
import { Users, FileText, ShieldAlert, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });

function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const [violations, setViolations] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  useEffect(() => {
    getAdminSummary().then((data) => {
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
        <h1 className="text-2xl font-bold">System overview</h1>
        <p className="text-muted-foreground">Platform-wide health and activity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={(stats.total_users ?? 0).toLocaleString?.() ?? stats.total_users ?? 0} icon={Users} accent="primary" trend="All users" />
        <StatCard title="Active Exams" value={stats.active_exams ?? 0} icon={FileText} accent="success" trend="In progress now" />
        <StatCard title="Violations" value={stats.violations ?? 0} icon={ShieldAlert} accent="destructive" trend="Last 24 hours" />
        <StatCard title="Uptime" value={`${stats.uptime ?? 99.9}%`} icon={Activity} accent="success" trend="Last 30 days" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle>Platform usage</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Security violations / week</CardTitle></CardHeader>
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
      </div>
    </div>
  );
}
