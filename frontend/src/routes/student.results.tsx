import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getStudentResultsOverview } from "@/lib/api";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/student/results")({ component: ResultsPage });

function ResultsPage() {
  const [completed, setCompleted] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  useEffect(() => {
    getStudentResultsOverview().then((data) => {
      setCompleted(data.results ?? []);
      setTrend(data.performance_trend ?? []);
    }).catch(() => {
      setCompleted([]);
      setTrend([]);
    });
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My results</h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Performance over time</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {completed.map((e) => (
          <Card key={e.id} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="text-xs text-muted-foreground">{e.subject} · {e.date}</p>
                </div>
                <Badge className={
                  (e.score ?? 0) >= 85 ? "bg-success/20 text-success border-0"
                  : (e.score ?? 0) >= 70 ? "bg-warning/20 text-warning border-0"
                  : "bg-destructive/20 text-destructive border-0"
                }>{e.score}%</Badge>
              </div>
              <Progress value={e.score} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
