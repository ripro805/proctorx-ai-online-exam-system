import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { studentNav } from "@/data/nav";
import { generateAiQuiz } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, HelpCircle, WandSparkles } from "lucide-react";

export const Route = createFileRoute("/student/ai-quiz")({ component: AiQuizPage });

function AiQuizPage() {
  const [topic, setTopic] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const createQuiz = async () => {
    setLoading(true);
    try {
      const res = await generateAiQuiz({ topic, difficulty, count });
      setQuiz(res.generated ?? res.quiz?.quiz_data ?? res.quiz);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="student" items={studentNav} label="Student Portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">AI Quiz Generator</h1>
          <p className="text-muted-foreground">Generate topic-based MCQs with difficulty levels and explanations.</p>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><WandSparkles className="h-4 w-4" /> Generate quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
              <Button className="gradient-primary text-primary-foreground" onClick={() => void createQuiz()} disabled={loading}>
                {loading ? "Generating…" : "Generate quiz"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {quiz ? (
          <div className="grid gap-4">
            {(quiz.questions ?? []).map((q: any, idx: number) => (
              <Card key={idx} className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" /> Question {idx + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">{q.question}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(q.options ?? []).map((opt: string) => (
                      <div key={opt} className={`rounded-lg border p-3 text-sm ${opt === q.correct_option ? "border-success bg-success/5" : "border-border/60"}`}>
                        <div className="flex items-center gap-2">
                          {opt === q.correct_option ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Badge variant="outline">Option</Badge>}
                          {opt}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{q.explanation ?? ""}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/60 border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Generate a quiz to see AI-created questions here.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
