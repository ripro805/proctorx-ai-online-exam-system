import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { getTeacherAiAnalytics } from "@/lib/api";

export const Route = createFileRoute("/teacher/ai-analytics")({ component: TeacherAiAnalytics });

function TeacherAiAnalytics() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    getTeacherAiAnalytics().then((d) => setData(d)).catch(() => setData(null));
  }, []);

  const topSubjects = (data?.top_subjects ?? []).map((s: any) => ({ name: s.subject || "General", count: s.count }));
  const providerUsage = (data?.provider_usage ?? []).map((p: any) => ({ name: p.provider || "unknown", value: p.count }));
  const COLORS = ["#4f46e5", "#06b6d4", "#f97316", "#10b981", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Tutor analytics</h1>
        <p className="text-muted-foreground">Usage and performance insights for the AI Tutor across students and subjects.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader><CardTitle>Total conversations</CardTitle></CardHeader>
          <CardContent className="p-4 text-lg font-medium">{data?.total_conversations ?? "—"}</CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Conversations (30d)</CardTitle></CardHeader>
          <CardContent className="p-4 text-lg font-medium">{data?.conversations_last_30_days ?? "—"}</CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Avg messages / convo</CardTitle></CardHeader>
          <CardContent className="p-4 text-lg font-medium">{data?.avg_messages_per_conversation ?? "—"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle>Top subjects</CardTitle></CardHeader>
          <CardContent className="h-72">
            {topSubjects.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSubjects} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No subject data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader><CardTitle>Provider usage</CardTitle></CardHeader>
          <CardContent className="h-72">
            {providerUsage.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={providerUsage} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                    {providerUsage.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No provider data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader><CardTitle>Recent AI activity</CardTitle></CardHeader>
        <CardContent>
          { (data?.recent_activity ?? []).length ? (
            <div className="space-y-2">
              {(data.recent_activity ?? []).slice(0, 20).map((r: any) => (
                <div key={r.id} className="p-3 rounded-lg border border-border/60">
                  <div className="text-sm font-medium">{r.title ?? 'Chat'}</div>
                  <div className="text-xs text-muted-foreground">{r.student__name} • {r.subject ?? 'General'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No recent activity.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
