import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudentExams } from "@/lib/api";
import { useEffect, useState } from "react";
import { Clock, Calendar, FileText, Play, Eye } from "lucide-react";

export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questions: number;
  date: string;
  status: "upcoming" | "ongoing" | "completed";
  score?: number;
}

export const Route = createFileRoute("/student/exams")({ component: ExamsPage });

function ExamRow({ e }: { e: Exam }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{e.title}</h3>
            <Badge variant="outline" className="capitalize">{e.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{e.subject}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {e.date}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.duration} min</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {e.questions} questions</span>
            {e.score !== undefined && <span className="text-success font-medium">Score: {e.score}%</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {e.status === "ongoing" && (
            <Button asChild className="gradient-primary text-primary-foreground">
              <Link to="/student/exam/$examId" params={{ examId: e.id }}><Play className="mr-1 h-3 w-3" /> Start</Link>
            </Button>
          )}
          {e.status === "upcoming" && <Button variant="outline" disabled>Locked until {e.date}</Button>}
          {e.status === "completed" && (
            <Button asChild variant="outline"><Link to="/student/results"><Eye className="mr-1 h-3 w-3" /> View result</Link></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExamsPage() {
  const [rows, setRows] = useState<Exam[]>([]);
  useEffect(() => {
    getStudentExams().then((data) => setRows(data.exams ?? [])).catch(() => setRows([]));
  }, []);
  const filter = (s: Exam["status"]) => rows.filter((e) => e.status === s);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My exams</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({filter("upcoming").length})</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing ({filter("ongoing").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filter("completed").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-3 mt-4">{rows.map((e) => <ExamRow key={e.id} e={e} />)}</TabsContent>
        <TabsContent value="upcoming" className="space-y-3 mt-4">{filter("upcoming").map((e) => <ExamRow key={e.id} e={e} />)}</TabsContent>
        <TabsContent value="ongoing" className="space-y-3 mt-4">{filter("ongoing").map((e) => <ExamRow key={e.id} e={e} />)}</TabsContent>
        <TabsContent value="completed" className="space-y-3 mt-4">{filter("completed").map((e) => <ExamRow key={e.id} e={e} />)}</TabsContent>
      </Tabs>
    </div>
  );
}
