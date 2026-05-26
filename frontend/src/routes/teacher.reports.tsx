import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useEffect, useState } from "react";
import { getTeacherReports } from "@/lib/api";

export const Route = createFileRoute("/teacher/reports")({ component: ReportsPage });

function ReportsPage() {
  const [distribution, setDistribution] = useState<any[]>([]);
  useEffect(() => {
    getTeacherReports().then((data) => setDistribution((data.distribution ?? []).map((d: any, i: number) => ({
      ...d,
      color: ["var(--chart-3)", "var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"][i % 5],
    }))))
    .catch(() => setDistribution([]));
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button className="gradient-primary text-primary-foreground"><Download className="h-4 w-4 mr-1" /> Export PDF</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader><CardTitle>Grade distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={90} label>
                  {distribution.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Available reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Term performance summary", "Question difficulty analysis", "Integrity incidents report", "Per-student progression"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-md border border-border/60 p-3 hover:bg-muted/40">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm">{r}</span></div>
                <Button size="sm" variant="ghost"><Download className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
