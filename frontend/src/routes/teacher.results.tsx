import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTeacherResults, getTeacherAnalytics } from "@/lib/api";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/teacher/results")({ component: TeacherResultsPage });

function TeacherResultsPage() {
  const [trend, setTrend] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  useEffect(() => {
    getTeacherAnalytics().then((data) => setTrend(data.performance_trend ?? [])).catch(() => setTrend([]));
    getTeacherResults().then((data) => setResults(data.results ?? [])).catch(() => setResults([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exam results</h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Cohort average</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Student</TableHead><TableHead>Exam</TableHead>
              <TableHead>Score</TableHead><TableHead>Integrity</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {results.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>{r.exam_title}</TableCell>
                  <TableCell><Badge className={(r.percentage ?? 0) >= 85 ? "bg-success/20 text-success border-0" : "bg-warning/20 text-warning border-0"}>{Math.round(r.percentage ?? 0)}%</Badge></TableCell>
                  <TableCell><Badge className="bg-success/20 text-success border-0">{r.integrity ?? 100}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
