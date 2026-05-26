import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, Plus, Search, Trash2 } from "lucide-react";

import { createExam, getQuestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type QuestionType = "mcq" | "description" | "image";
type ChoiceDraft = { text: string; is_correct: boolean };
type QuestionDraft = {
  text: string;
  question_type: QuestionType;
  marks: number;
  choices: ChoiceDraft[];
  correct_answer_data: { text?: string; image?: string };
  explanation?: string;
  sourceQuestionId?: number;
  sourceExamTitle?: string;
  sourceSubject?: string;
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

  const [bankOpen, setBankOpen] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankTargetIndex, setBankTargetIndex] = useState<number | null>(null);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

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

  const openBankPicker = async (index: number) => {
    setBankTargetIndex(index);
    setBankSearch("");
    setSelectedBankId(null);
    setBankOpen(true);
    setBankLoading(true);
    try {
      const data = await getQuestions({ bank: true, subject });
      const list = normalizeList(data, ["results", "questions", "items"]);
      setBankQuestions(list);
      setSelectedBankId(list[0]?.id ?? null);
    } catch {
      setBankQuestions([]);
      toast.error("Failed to load question bank");
    } finally {
      setBankLoading(false);
    }
  };

  const applyBankQuestion = () => {
    if (bankTargetIndex === null) return;
    const selected = bankQuestions.find((q) => q.id === selectedBankId);
    if (!selected) {
      toast.error("Please select a question from the bank");
      return;
    }
    setQuestionAt(bankTargetIndex, mapBankQuestion(selected));
    setBankOpen(false);
  };

  const addNewQuestionFromBank = async () => {
    if (!canAddMore) {
      toast.error("Question limit reached");
      return;
    }
    const nextIndex = questions.length;
    addQuestion();
    await openBankPicker(nextIndex);
  };

  const filteredQuestions = filteredBankQuestions(bankQuestions, bankSearch);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Create exam</h1>
        <p className="text-muted-foreground">Configure a new proctored examination.</p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const title = String(form.get("title") ?? "");
          const description = String(form.get("description") ?? "");
          const subjectValue = subject || "General";
          const duration = Number(form.get("duration") ?? 60);
          const date = String(form.get("schedule_date") ?? "");
          const time = String(form.get("schedule_time") ?? "");
          const schedule = date && time ? new Date(`${date}T${time}:00`) : new Date();
          const end = new Date(schedule.getTime() + duration * 60000);

          try {
            await createExam({
              title,
              description,
              subject: subjectValue,
              duration_minutes: duration,
              max_questions: questionCount,
              start_time: schedule.toISOString(),
              end_time: end.toISOString(),
              is_published: publish,
              questions: normalizedQuestions.map((q) => ({
                text: q.text,
                question_type: q.question_type,
                marks: q.marks,
                explanation: q.explanation ?? "",
                choices: q.question_type === "mcq"
                  ? q.choices.map((c) => ({ text: c.text, is_correct: c.is_correct })).filter((c) => c.text.trim())
                  : [],
                correct_answer_data: q.question_type === "description"
                  ? { text: q.correct_answer_data.text ?? "" }
                  : q.question_type === "image"
                    ? { image: q.correct_answer_data.image ?? "" }
                    : {},
              })),
            });
            toast.success(publish ? "Exam created and published!" : "Exam saved as draft.");
          } catch {
            toast.error("Failed to create exam");
          }
        }}
      >
        <Card className="border-border/60">
          <CardHeader><CardTitle>Exam details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t">Title</Label>
              <Input id="t" name="title" required placeholder="e.g. Midterm — Data Structures" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" name="description" rows={3} placeholder="Instructions and topics covered…" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="dur">Duration (minutes)</Label>
                <Input id="dur" name="duration" type="number" defaultValue={60} min={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule_date">Scheduled date</Label>
                <Input id="schedule_date" name="schedule_date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule_time">Scheduled time</Label>
                <Input id="schedule_time" name="schedule_time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void addNewQuestionFromBank()} disabled={!canAddMore}>
                <BookOpen className="h-4 w-4 mr-1" /> Reuse from bank
              </Button>
              <Button type="button" onClick={addQuestion} disabled={!canAddMore}>
                <Plus className="h-4 w-4 mr-1" /> Add blank question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Create up to <span className="font-medium text-foreground">{questionCount}</span> questions. Each card can be manually created or filled from the question bank.
            </p>

            {normalizedQuestions.map((q, index) => (
              <Card key={index} className="border-border/60">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">Question {index + 1}</div>
                      {q.sourceQuestionId ? (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                          <Check className="h-3 w-3" /> From bank: {q.sourceExamTitle ?? "Question bank"}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openBankPicker(index)}>
                        <BookOpen className="h-4 w-4 mr-1" /> Select from bank
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)} disabled={normalizedQuestions.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Question text</Label>
                      <Textarea
                        value={q.text}
                        onChange={(e) => setQuestionAt(index, { text: e.target.value })}
                        rows={3}
                        placeholder="Enter the question prompt…"
                      />
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
              <div key={s} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
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

        <div className="mt-4 flex gap-2">
          <Button type="submit" className="gradient-primary text-primary-foreground">
            {publish ? "Create & publish" : "Save draft"}
          </Button>
          <Button type="button" variant="outline">Cancel</Button>
        </div>
      </form>

      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a reusable bank question</DialogTitle>
            <DialogDescription>
              Select a question for {bankTargetIndex !== null ? `Question ${bankTargetIndex + 1}` : "the exam"}. Questions are filtered by the exam subject.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search reusable questions…"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                />
              </div>

              <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {bankLoading ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Loading question bank…</div>
                ) : filteredQuestions.length ? (
                  filteredQuestions.map((q) => {
                    const active = selectedBankId === q.id;
                    return (
                      <button
                        type="button"
                        key={q.id}
                        onClick={() => setSelectedBankId(q.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 h-4 w-4 rounded-full border ${active ? "border-primary bg-primary" : "border-muted-foreground/30"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-medium">{q.text}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full border px-2 py-0.5">{q.question_type ?? "mcq"}</span>
                              <span className="rounded-full border px-2 py-0.5">{q.exam_title ?? "Exam"}</span>
                              <span className="rounded-full border px-2 py-0.5">{q.subject ?? subject}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No reusable questions found for this subject.</div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 p-4">
              {bankQuestions.find((q) => q.id === selectedBankId) ? (
                (() => {
                  const selected = bankQuestions.find((q) => q.id === selectedBankId);
                  if (!selected) return null;
                  return (
                    <>
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Preview</div>
                        <div className="text-sm font-semibold">{selected.text}</div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Type:</span> {selected.question_type ?? "mcq"}</div>
                        <div><span className="font-medium">Exam:</span> {selected.exam_title ?? "Exam"}</div>
                        <div><span className="font-medium">Subject:</span> {selected.subject ?? subject}</div>
                        <div><span className="font-medium">Marks:</span> {selected.marks ?? 1}</div>
                      </div>

                      {selected.question_type === "mcq" && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Choices</div>
                          <div className="space-y-2">
                            {(selected.choices ?? []).map((choice: any, idx: number) => (
                              <div key={idx} className={`rounded-md border p-2 text-sm ${choice.is_correct ? "border-success bg-success/5" : "border-border/60"}`}>
                                {choice.text}{choice.is_correct ? " ✓" : ""}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Explanation</div>
                            <p className="text-sm text-muted-foreground">{selected.explanation || "No explanation available."}</p>
                          </div>
                        </div>
                      )}

                      {selected.question_type === "description" && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Expected answer</div>
                          <p className="text-sm text-muted-foreground">{selected.correct_answer_data?.text ?? "No reference answer stored."}</p>
                        </div>
                      )}

                      {selected.question_type === "image" && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Expected image answer</div>
                          {selected.correct_answer_data?.image ? (
                            <img src={selected.correct_answer_data.image} alt="Bank answer preview" className="max-h-48 rounded-md border object-cover" />
                          ) : (
                            <p className="text-sm text-muted-foreground">No image answer stored.</p>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <div className="text-sm text-muted-foreground">Select a question from the list to preview it here.</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBankOpen(false)}>Cancel</Button>
            <Button onClick={applyBankQuestion} disabled={bankTargetIndex === null || !selectedBankId}>
              Use selected question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function filteredBankQuestions(bankQuestions: any[], search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return bankQuestions;
  return bankQuestions.filter((q) => `${q.text} ${q.exam_title ?? ""} ${q.subject ?? ""}`.toLowerCase().includes(term));
}

function mapBankQuestion(question: any): QuestionDraft {
  return {
    text: question.text ?? "",
    question_type: question.question_type ?? "mcq",
    marks: Number(question.marks ?? 1),
    choices: Array.isArray(question.choices)
      ? question.choices.map((choice: any) => ({ text: String(choice.text ?? ""), is_correct: Boolean(choice.is_correct) }))
      : [],
    correct_answer_data: question.question_type === "description"
      ? { text: question.correct_answer_data?.text ?? "" }
      : question.question_type === "image"
        ? { image: question.correct_answer_data?.image ?? "" }
        : {},
    explanation: question.explanation ?? "",
    sourceQuestionId: question.id,
    sourceExamTitle: question.exam_title,
    sourceSubject: question.subject,
  };
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
    explanation: "",
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

function normalizeList(data: any, keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}
