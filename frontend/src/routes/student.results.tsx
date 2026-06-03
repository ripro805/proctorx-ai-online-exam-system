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
  const [selectedResultId, setSelectedResultId] = useState<string | number | null>(null);
  useEffect(() => {
    getStudentResultsOverview().then((data) => {
      const results = data.results ?? [];
      setCompleted(results);
      setTrend(data.performance_trend ?? []);
      setSelectedResultId(results[0]?.result_id ?? results[0]?.id ?? null);
    }).catch(() => {
      setCompleted([]);
      setTrend([]);
      setSelectedResultId(null);
    });
  }, []);

  const selectedResult = completed.find((item) => String(item.result_id ?? item.id) === String(selectedResultId ?? "")) ?? completed[0] ?? null;

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
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {completed.map((e) => {
            const isActive = String((e.result_id ?? e.id) ?? "") === String(selectedResultId ?? "");
            return (
              <button
                key={e.result_id ?? e.id}
                type="button"
                onClick={() => setSelectedResultId(e.result_id ?? e.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{e.subject} · {e.date}</p>
                  </div>
                  <Badge className={
                    (e.score ?? 0) >= 85 ? "bg-success/20 text-success border-0"
                    : (e.score ?? 0) >= 70 ? "bg-warning/20 text-warning border-0"
                    : "bg-destructive/20 text-destructive border-0"
                  }>{e.score}%</Badge>
                </div>
                <Progress value={e.score} className="mt-3" />
              </button>
            );
          })}
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Answer review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedResult ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedResult.subject ?? "General"}</Badge>
                  <Badge variant="outline">{selectedResult.title}</Badge>
                  <Badge className={
                    (selectedResult.score ?? 0) >= 85 ? "bg-success/20 text-success border-0"
                    : (selectedResult.score ?? 0) >= 70 ? "bg-warning/20 text-warning border-0"
                    : "bg-destructive/20 text-destructive border-0"
                  }>{selectedResult.score}%</Badge>
                </div>

                <div className="space-y-3">
                  {(selectedResult.answers ?? []).map((answer: any, idx: number) => {
                    const wrong = !answer.is_correct;
                    return (
                      <div
                        key={answer.question_id ?? idx}
                        className={`rounded-xl border p-4 ${wrong ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">Question {idx + 1}</p>
                            <p className="mt-1 text-sm">{answer.question}</p>
                          </div>
                          <Badge className={wrong ? "bg-destructive/20 text-destructive border-0" : "bg-success/20 text-success border-0"}>
                            {wrong ? "Wrong" : "Correct"}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your answer</p>
                            <p className={`mt-1 text-sm font-medium ${wrong ? "text-destructive" : "text-foreground"}`}>
                              {answer.your_answer ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Correct answer</p>
                            <p className="mt-1 text-sm font-medium text-success">{answer.correct_answer ?? "—"}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Explanation</p>
                          <p className="mt-1 text-sm text-muted-foreground">{answer.explanation || "No explanation available."}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!selectedResult.answers?.length && (
                    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                      No question-level answer data is available for this result yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No results available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
