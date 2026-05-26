import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStudentExams } from "@/lib/api";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";

export const Route = createFileRoute("/student/ongoing")({ component: OngoingPage });

function OngoingPage() {
  const [ongoing, setOngoing] = useState<any[]>([]);
  useEffect(() => {
    getStudentExams().then((data) => setOngoing((data.exams ?? []).filter((e: any) => e.status === "ongoing")))
      .catch(() => setOngoing([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ongoing exams</h1>
      {ongoing.length === 0 ? (
        <Card className="border-border/60"><CardContent className="p-12 text-center text-muted-foreground">No active exams right now.</CardContent></Card>
      ) : ongoing.map((e) => (
        <Card key={e.id} className="border-warning/40 shadow-glow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{e.title}</h3>
              <p className="text-sm text-muted-foreground">{e.subject} · {e.duration} min · {e.questions} questions</p>
              <p className="text-xs text-warning mt-2">⚠ AI proctoring will activate when you start.</p>
            </div>
            <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow">
              <Link to="/student/exam/$examId" params={{ examId: e.id }}><Play className="mr-2 h-4 w-4" /> Start exam</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
