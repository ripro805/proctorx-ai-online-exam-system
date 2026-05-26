import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getQuestions } from "@/lib/api";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/teacher/questions")({ component: QuestionsPage });

function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  useEffect(() => {
    getQuestions().then((data) => setQuestions(data.results ?? data ?? [])).catch(() => setQuestions([]));
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Question bank</h1>
        <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add question</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search questions…" className="pl-9" />
      </div>
      <div className="space-y-2">
        {questions.map((q) => (
          <Card key={q.id} className="border-border/60">
            <CardContent className="p-4 flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Q{q.id}</Badge>
              <div className="flex-1">
                <p className="text-sm">{q.text}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-success/20 text-success border-0 text-[10px]">MCQ</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.exam_title ?? "Exam"}</Badge>
                  <Badge variant="outline" className="text-[10px]">Difficulty: Medium</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
