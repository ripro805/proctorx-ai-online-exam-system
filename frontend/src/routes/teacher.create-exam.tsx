import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChangeEvent, useMemo, useState } from "react";
import { createExam } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type QuestionType = "mcq" | "description" | "image";

type ChoiceDraft = { text: string; is_correct: boolean };

type QuestionDraft = {
  text: string;
  question_type: QuestionType;
  marks: number;
  choices: ChoiceDraft[];
  correct_answer_data: { text?: string; image?: string };
};

export const Route = createFileRoute("/teacher/create-exam")({ component: CreateExamPage });

function CreateExamPage() {
  const [publish, setPublish] = useState(false);
  const [subject, setSubject] = useState("Computer Science");
  const [questionCount, setQuestionCount] = useState(5);
  const [questionCountText, setQuestionCountText] = useState("5");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => defaultQuestions(5));

  const canAddMore = questions.length < questionCount;

  const normalizedQuestions = useMemo(() => questions.slice(0, questionCount), [questions, questionCount]);

  const setQuestionAt = (index: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateChoice = (qIndex: number, cIndex: number, patch: Partial<ChoiceDraft>) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const choices = q.choices.map((c, j) => (j === cIndex ? { ...c, ...patch } : c));
      return { ...q, choices };
    }));
  };

  const addChoice = (qIndex: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, choices: [...q.choices, { text: "", is_correct: q.choices.length === 0 }] };
    }));
  };

  const removeChoice = (qIndex: number, cIndex: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const choices = q.choices.filter((_, j) => j !== cIndex);
      return { ...q, choices: choices.length ? choices : [{ text: "", is_correct: true }] };
    }));
  };

  const addQuestion = () => {
    if (!canAddMore) return;
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const syncQuestionCount = (next: number) => {
    const safeNext = Math.max(1, Math.min(100, next || 1));
    setQuestionCount(safeNext);
    setQuestionCountText(String(safeNext));
    setQuestions((prev) => {
      if (prev.length === safeNext) return prev;
      if (prev.length > safeNext) return prev.slice(0, safeNext);
      return [...prev, ...defaultQuestions(safeNext - prev.length)];
    });
  };

  const commitQuestionCount = () => {
    const next = Number.parseInt(questionCountText, 10);
    syncQuestionCount(Number.isFinite(next) ? next : questionCount);
  };

  const handleImageFile = async (index: number, file?: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setQuestionAt(index, { correct_answer_data: { image: dataUrl } });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Create exam</h1>
        <p className="text-muted-foreground">Configure a new proctored examination.</p>
      </div>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const title = String(form.get("title") ?? "");
        const description = String(form.get("description") ?? "");
        const subjectValue = subject || "General";
        const duration = Number(form.get("duration") ?? 60);
        const date = String(form.get("schedule_date") ?? "");
        const time = String(form.get("schedule_time") ?? "");
        const schedule = date && time ? new Date(`${date}T${time}:00`) : new Date();
        const maxQuestions = questionCount;
        const nestedQuestions = normalizedQuestions.map((q) => ({
          text: q.text,
          question_type: q.question_type,
          marks: q.marks,
          choices: q.question_type === "mcq"
            ? q.choices
                .map((c) => ({ text: c.text, is_correct: c.is_correct }))
                .filter((c) => c.text.trim())
            : [],
          correct_answer_data: q.question_type === "description"
            ? { text: q.correct_answer_data.text ?? "" }
            : q.question_type === "image"
              ? { image: q.correct_answer_data.image ?? "" }
              : {},
        }));
        const end = new Date(schedule.getTime() + duration * 60000);
        await createExam({
          title,
          description,
          subject: subjectValue,
          duration_minutes: duration,
          max_questions: maxQuestions,
          start_time: schedule.toISOString(),
          end_time: end.toISOString(),
          is_published: publish,
          questions: nestedQuestions,
        }).then(() => {
          toast.success(publish ? "Exam created and published!" : "Exam saved as draft.");
        }).catch(() => toast.error("Failed to create exam"));
      }}>
        <Card className="border-border/60">
          <CardHeader><CardTitle>Exam details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="t">Title</Label><Input id="t" name="title" required placeholder="e.g. Midterm — Data Structures" /></div>
            <div className="space-y-2"><Label htmlFor="d">Description</Label><Textarea id="d" name="description" rows={3} placeholder="Instructions and topics covered…" /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select defaultValue="Computer Science" onValueChange={setSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label htmlFor="dur">Duration (minutes)</Label><Input id="dur" name="duration" type="number" defaultValue={60} min={10} /></div>
              <div className="space-y-2"><Label htmlFor="schedule_date">Scheduled date</Label><Input id="schedule_date" name="schedule_date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="schedule_time">Scheduled time</Label><Input id="schedule_time" name="schedule_time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></div>
              <div className="space-y-2">
                <Label htmlFor="qn">Number of questions</Label>
                <Input
                  id="qn"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={questionCountText}
                  onChange={(e) => setQuestionCountText(e.target.value.replace(/\D/g, ""))}
                  onBlur={commitQuestionCount}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitQuestionCount();
                    }
                  }}
                  placeholder="e.g. 25"
                />
                <p className="text-[11px] text-muted-foreground">Type any number and press Enter or click outside to apply.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Questions</CardTitle>
            <Button type="button" variant="outline" onClick={addQuestion} disabled={!canAddMore}>
              <Plus className="h-4 w-4 mr-1" /> Add question
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Create up to <span className="font-medium text-foreground">{questionCount}</span> questions. Each question can be MCQ, description, or image-based.
            </p>
            {normalizedQuestions.map((q, index) => (
              <Card key={index} className="border-border/60">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">Question {index + 1}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)} disabled={normalizedQuestions.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Question text</Label>
                      <Textarea value={q.text} onChange={(e) => setQuestionAt(index, { text: e.target.value })} rows={3} placeholder="Enter the question prompt…" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={q.question_type} onValueChange={(value) => setQuestionAt(index, { question_type: value as QuestionType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="description">Description</SelectItem>
                          <SelectItem value="image">Image answer</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="space-y-2 pt-2">
                        <Label>Marks</Label>
                        <Input type="number" min={1} value={q.marks} onChange={(e) => setQuestionAt(index, { marks: Number(e.target.value) || 1 })} />
                      </div>
                    </div>
                  </div>

                  {q.question_type === "mcq" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Choices</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => addChoice(index)}>Add choice</Button>
                      </div>
                      <div className="space-y-2">
                        {q.choices.map((choice, cIndex) => (
                          <div key={cIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${index}`}
                              checked={choice.is_correct}
                              onChange={() => setQuestions((prev) => prev.map((item, i) => {
                                if (i !== index) return item;
                                return {
                                  ...item,
                                  choices: item.choices.map((c, j) => ({ ...c, is_correct: j === cIndex })),
                                };
                              }))}
                            />
                            <Input value={choice.text} onChange={(e) => updateChoice(index, cIndex, { text: e.target.value })} placeholder={`Choice ${cIndex + 1}`} />
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeChoice(index, cIndex)} disabled={q.choices.length <= 1}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.question_type === "description" && (
                    <div className="space-y-2">
                      <Label>Expected description answer</Label>
                      <Textarea
                        value={q.correct_answer_data.text ?? ""}
                        onChange={(e) => setQuestionAt(index, { correct_answer_data: { text: e.target.value } })}
                        rows={3}
                        placeholder="Enter the reference answer for manual review or simple matching…"
                      />
                    </div>
                  )}

                  {q.question_type === "image" && (
                    <div className="space-y-2">
                      <Label>Expected image answer</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => void handleImageFile(index, e.target.files?.[0] ?? null)}
                      />
                      {q.correct_answer_data.image && (
                        <img src={q.correct_answer_data.image} alt="Expected answer preview" className="mt-2 h-28 rounded-md border object-cover" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 mt-4">
          <CardHeader><CardTitle>Proctoring settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              "Require webcam during exam",
              "Detect tab switching",
              "Enforce fullscreen mode",
              "Disable copy / paste",
              "Randomize question order",
            ].map((s) => (
              <div key={s} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <Label>{s}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60 mt-4">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <Label className="font-medium">Publish immediately</Label>
              <p className="text-xs text-muted-foreground">If off, exam will be saved as draft.</p>
            </div>
            <Switch checked={publish} onCheckedChange={setPublish} />
          </CardContent>
        </Card>
        <div className="flex gap-2 mt-4">
          <Button type="submit" className="gradient-primary text-primary-foreground">{publish ? "Create & publish" : "Save draft"}</Button>
          <Button type="button" variant="outline">Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function defaultQuestions(count: number): QuestionDraft[] {
  return Array.from({ length: count }, () => emptyQuestion());
}

function emptyQuestion(): QuestionDraft {
  return {
    text: "",
    question_type: "mcq",
    marks: 1,
    choices: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
    ],
    correct_answer_data: {},
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
