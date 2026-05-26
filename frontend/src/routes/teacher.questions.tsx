import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestion, getQuestions, getTeacherExams, updateQuestion } from "@/lib/api";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/questions")({ component: QuestionsPage });

type QuestionType = "mcq" | "description" | "image";

function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [examId, setExamId] = useState("all");
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [bankSubject, setBankSubject] = useState("all");
  const [selectedToBank, setSelectedToBank] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState("all");
  const [form, setForm] = useState({
    exam_id: "",
    text: "",
    question_type: "mcq" as QuestionType,
    marks: 1,
    choices: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
    ],
    correct_answer_data: { text: "", image: "" },
  });

  useEffect(() => {
    Promise.all([
      getQuestions({ bank: true }),
      getQuestions({ bank: false }),
      getTeacherExams(),
    ])
      .then(([banked, unbanked, examsRes]) => {
        setQuestions(normalizeList(banked, ["results", "questions", "items"]));
        setAvailableQuestions(normalizeList(unbanked, ["results", "questions", "items"]));
        setExams(normalizeList(examsRes, ["exams", "results", "items"]));
      })
      .catch((err: any) => {
        const msg = err?.message ?? String(err ?? "Failed to load questions");
        toast.error(msg.includes("Authentication") ? "Please sign in to view the question bank" : msg);
        setQuestions([]);
        setAvailableQuestions([]);
        setExams([]);
      });
  }, []);

  const subjects = useMemo(() => {
    return Array.from(new Set(exams.map((e: any) => e.subject).filter(Boolean)));
  }, [exams]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch = !search || `${q.text} ${q.exam_title ?? ""} ${q.subject ?? ""}`.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subject === "all" || String(q.subject ?? "").toLowerCase() === subject.toLowerCase();
      const matchesExam = examId === "all" || String(q.exam ?? q.exam_id ?? "") === examId;
      return matchesSearch && matchesSubject && matchesExam;
    });
  }, [questions, search, subject, examId]);

  const examsForFilter = useMemo(() => {
    if (subject === "all") return exams;
    return exams.filter((e: any) => String(e.subject ?? "").toLowerCase() === subject.toLowerCase());
  }, [exams, subject]);

  const createExamsForFilter = useMemo(() => {
    if (createSubject === "all") return exams;
    return exams.filter((e: any) => String(e.subject ?? "").toLowerCase() === createSubject.toLowerCase());
  }, [exams, createSubject]);

  const filteredAvailableQuestions = useMemo(() => {
    return availableQuestions.filter((q) => {
      const matchesSearch = !bankSearch || `${q.text} ${q.exam_title ?? ""} ${q.subject ?? ""}`.toLowerCase().includes(bankSearch.toLowerCase());
      const matchesSubject = bankSubject === "all" || String(q.subject ?? "").toLowerCase() === bankSubject.toLowerCase();
      return matchesSearch && matchesSubject;
    });
  }, [availableQuestions, bankSearch, bankSubject]);

  const refreshQuestions = async () => {
    try {
      const [banked, unbanked] = await Promise.all([getQuestions({ bank: true }), getQuestions({ bank: false })]);
      setQuestions(normalizeList(banked, ["results", "questions", "items"]));
      setAvailableQuestions(normalizeList(unbanked, ["results", "questions", "items"]));
    } catch (err: any) {
      const msg = err?.message ?? String(err ?? "Failed to refresh questions");
      toast.error(msg.includes("Authentication") ? "Please sign in to view the question bank" : msg);
      setQuestions([]);
      setAvailableQuestions([]);
    }
  };

  const addChoice = () => setForm((prev) => ({ ...prev, choices: [...prev.choices, { text: "", is_correct: false }] }));

  const updateChoice = (index: number, patch: Partial<{ text: string; is_correct: boolean }>) => {
    setForm((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, i) => (i === index ? { ...choice, ...patch } : choice)),
    }));
  };

  const removeChoice = (index: number) => {
    setForm((prev) => ({
      ...prev,
      choices: prev.choices.filter((_, i) => i !== index).length ? prev.choices.filter((_, i) => i !== index) : [{ text: "", is_correct: true }],
    }));
  };

  const toggleSelection = (id: number) => {
    setSelectedToBank((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const bankSelectedQuestions = async () => {
    if (!selectedToBank.length) {
      toast.error("Please select at least one question");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(selectedToBank.map((id) => updateQuestion(String(id), { is_in_bank: true })));
      toast.success("Selected questions added to bank");
      setSelectedToBank([]);
      await refreshQuestions();
      setOpen(false);
    } catch {
      toast.error("Failed to add selected questions");
    } finally {
      setSaving(false);
    }
  };

  const saveQuestion = async () => {
    if (!form.exam_id) {
      toast.error("Please select an exam first");
      return;
    }
    if (!form.text.trim()) {
      toast.error("Please enter question text");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        exam: Number(form.exam_id),
        text: form.text,
        question_type: form.question_type,
        marks: form.marks,
      };
      if (form.question_type === "mcq") {
        payload.choices = form.choices.filter((c) => c.text.trim()).map((c) => ({ text: c.text, is_correct: c.is_correct }));
      }
      if (form.question_type === "description") {
        payload.correct_answer_data = { text: form.correct_answer_data.text };
      }
      if (form.question_type === "image") {
        payload.correct_answer_data = { image: form.correct_answer_data.image };
      }
      await createQuestion(payload);
      toast.success("Question added successfully");
      setCreateOpen(false);
      setForm({
        exam_id: form.exam_id,
        text: "",
        question_type: "mcq",
        marks: 1,
        choices: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
        ],
        correct_answer_data: { text: "", image: "" },
      });
      await refreshQuestions();
    } catch {
      toast.error("Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Question bank</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New question
          </Button>
          <Button className="gradient-primary text-primary-foreground" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add from exams
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search questions…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={subject} onValueChange={(value) => { setSubject(value); setExamId("all"); }}>
          <SelectTrigger>
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exams</SelectItem>
            {examsForFilter.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {filteredQuestions.map((q) => (
          <Card key={q.id} className="border-border/60 cursor-pointer hover:border-primary/60 transition-colors" onClick={() => { setSelectedQuestion(q); setDetailsOpen(true); }}>
            <CardContent className="p-4 flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Q{q.id}</Badge>
              <div className="flex-1">
                <p className="text-sm">{q.text}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-success/20 text-success border-0 text-[10px] uppercase">{q.question_type ?? "MCQ"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.exam_title ?? "Exam"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.subject ?? "General"}</Badge>
                  <Badge variant="outline" className="text-[10px]">In bank</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add questions from exams</DialogTitle>
            <DialogDescription>
              Select questions that exist in exams but are not yet in the bank, then add them with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search unbanked questions…" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} />
            </div>
            <Select value={bankSubject} onValueChange={setBankSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredAvailableQuestions.length ? filteredAvailableQuestions.map((q) => (
              <button
                key={q.id}
                type="button"
                className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedToBank.includes(q.id) ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
                onClick={() => toggleSelection(q.id)}
              >
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedToBank.includes(q.id)} readOnly className="mt-1 h-4 w-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px]">{q.question_type ?? "mcq"}</Badge>
                      <Badge variant="outline" className="text-[10px]">{q.exam_title ?? "Exam"}</Badge>
                      <Badge variant="outline" className="text-[10px]">{q.subject ?? "General"}</Badge>
                    </div>
                  </div>
                </div>
              </button>
            )) : <p className="text-sm text-muted-foreground">No matching questions found.</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => void bankSelectedQuestions()} disabled={saving}>
              {saving ? "Adding…" : `Add selected (${selectedToBank.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question details</DialogTitle>
            <DialogDescription>
              View the correct answer, explanation, and related metadata for this question.
            </DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Q{selectedQuestion.id}</Badge>
                <Badge variant="outline">{selectedQuestion.question_type ?? "mcq"}</Badge>
                <Badge variant="outline">{selectedQuestion.exam_title ?? "Exam"}</Badge>
                <Badge variant="outline">{selectedQuestion.subject ?? "General"}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Question</p>
                <p className="text-sm text-muted-foreground">{selectedQuestion.text}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Correct answer</p>
                {selectedQuestion.question_type === "mcq" ? (
                  <div className="space-y-2">
                    {(selectedQuestion.choices ?? []).map((choice: any, index: number) => (
                      <div key={index} className={`rounded-md border p-2 text-sm ${choice.is_correct ? "border-success bg-success/5" : "border-border/60"}`}>
                        {choice.text}
                        {choice.is_correct ? " ✓" : ""}
                      </div>
                    ))}
                  </div>
                ) : selectedQuestion.question_type === "image" ? (
                  selectedQuestion.correct_answer_data?.image ? <img src={selectedQuestion.correct_answer_data.image} alt="Answer" className="max-h-56 rounded-md border" /> : <p className="text-sm text-muted-foreground">No image answer stored.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{selectedQuestion.correct_answer_data?.text ?? "No description answer stored."}</p>
                )}
              </div>
              {selectedQuestion.question_type === "mcq" && (
                <div>
                  <p className="text-sm font-medium mb-1">Explanation</p>
                  <p className="text-sm text-muted-foreground">{selectedQuestion.explanation || "No explanation provided."}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create question</DialogTitle>
            <DialogDescription>
              Create a new question and attach it to an exam.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={createSubject} onValueChange={(value) => setCreateSubject(value)}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={form.exam_id} onValueChange={(value) => setForm((prev) => ({ ...prev, exam_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {createExamsForFilter.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Question text</Label>
              <Textarea rows={3} value={form.text} onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))} placeholder="Enter question text…" />
            </div>
            <div className="space-y-2">
              <Label>Question type</Label>
              <Select value={form.question_type} onValueChange={(value) => setForm((prev) => ({ ...prev, question_type: value as QuestionType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input type="number" min={1} value={form.marks} onChange={(e) => setForm((prev) => ({ ...prev, marks: Number(e.target.value) || 1 }))} />
            </div>
          </div>

          {form.question_type === "mcq" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label>Choices</Label>
                <Button type="button" variant="outline" size="sm" onClick={addChoice}>Add choice</Button>
              </div>
              <div className="space-y-2">
                {form.choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={choice.is_correct}
                      onChange={() => setForm((prev) => ({ ...prev, choices: prev.choices.map((c, i) => ({ ...c, is_correct: i === idx })) }))}
                    />
                    <Input value={choice.text} onChange={(e) => updateChoice(idx, { text: e.target.value })} placeholder={`Choice ${idx + 1}`} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeChoice(idx)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.question_type === "description" && (
            <div className="space-y-2 pt-2">
              <Label>Expected answer</Label>
              <Textarea rows={3} value={form.correct_answer_data.text} onChange={(e) => setForm((prev) => ({ ...prev, correct_answer_data: { ...prev.correct_answer_data, text: e.target.value } }))} placeholder="Reference description answer…" />
            </div>
          )}

          {form.question_type === "image" && (
            <div className="space-y-2 pt-2">
              <Label>Expected answer image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await fileToDataUrl(file);
                  setForm((prev) => ({ ...prev, correct_answer_data: { ...prev.correct_answer_data, image: dataUrl } }));
                }}
              />
              {form.correct_answer_data.image && <img src={form.correct_answer_data.image} alt="Answer preview" className="h-28 rounded-md border object-cover" />}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => void saveQuestion()} disabled={saving}>
              {saving ? "Saving…" : "Save question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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
