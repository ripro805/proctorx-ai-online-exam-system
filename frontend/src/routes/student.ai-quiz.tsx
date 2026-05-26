import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateAiQuiz, submitAiQuiz } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, HelpCircle, WandSparkles } from "lucide-react";

export const Route = createFileRoute("/student/ai-quiz")({ component: AiQuizPage });

function AiQuizPage() {
  const [topic, setTopic] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<any>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const createQuiz = async () => {
    setLoading(true);
    try {
      const res = await generateAiQuiz({ topic, difficulty, count });
      // API returns public quiz without answers
      setQuiz(res.quiz ?? res);
      setSelected({});
      setResult(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (qIndex: number, key: string) => {
    setSelected((s) => ({ ...s, [String(qIndex + 1)]: key }));
  };

  const submit = async () => {
    if (!quiz) return;
    try {
      const res = await submitAiQuiz({ quiz_id: quiz.quiz_id, answers: selected });
      setResult(res);
      toast.success('Quiz submitted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit quiz');
    }
  };

  return (
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
                  {Object.entries(q.options ?? {}).map(([key, text]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectOption(idx, key)}
                      className={`text-left rounded-lg border p-3 text-sm ${selected[String(idx + 1)] === key ? 'border-primary bg-primary/5' : 'border-border/60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{key}</Badge>
                        <span>{text}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {!result ? (
                  <p className="text-sm text-muted-foreground">Select an option for this question. Answers will be revealed after submission.</p>
                ) : (
                  // After submission, find the corresponding result
                  (() => {
                    const detail = (result.correct_answers ?? [])[idx] ?? null;
                    if (!detail) return null;
                    return (
                      <div className="space-y-2">
                        <div className="text-sm">Your answer: {detail.your_answer ?? '—'}</div>
                        <div className="text-sm">Correct answer: {detail.correct_answer ?? '—'}</div>
                        <div className="text-sm text-muted-foreground">{detail.explanation}</div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          ))}
          {!result ? (
            <div className="flex gap-2">
              <Button onClick={() => void submit()} className="gradient-primary text-primary-foreground">Submit quiz</Button>
            </div>
          ) : (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div>Score: {result.score} / {result.total} ({result.percentage}%)</div>
                <div className="mt-2">Strength: {result.performance_analysis?.strength}</div>
                <div>Weakness: {result.performance_analysis?.weakness}</div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-border/60 border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Generate a quiz to see AI-created questions here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
