import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getTeacherExams, updateExam, deleteExam } from "@/lib/api";
import { Edit, Eye, Trash2, Plus, Calendar, Clock, FileQuestion, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/manage-exams")({ component: ManageExamsPage });

interface ExamRow {
  id: string;
  title: string;
  subject: string;
  date: string;
  duration: number;
  questions: number;
  status: "upcoming" | "ongoing" | "completed";
  score?: number;
}

function ManageExamsPage() {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [viewExam, setViewExam] = useState<ExamRow | null>(null);
  const [editExam, setEditExam] = useState<ExamRow | null>(null);
  const [deleteExamRow, setDeleteExamRow] = useState<ExamRow | null>(null);

  useEffect(() => {
    getTeacherExams().then((data) => {
      const now = Date.now();
      const mapped = (data.exams ?? []).map((e: any) => {
        const start = Date.parse(e.start_time);
        const end = Date.parse(e.end_time);
        const status = start > now ? "upcoming" : end < now ? "completed" : "ongoing";
        return {
          id: String(e.id),
          title: e.title,
          subject: e.subject ?? "General",
          date: new Date(e.start_time).toISOString().slice(0, 10),
          duration: Math.max(1, Math.round((end - start) / 60000)),
          questions: e.questions,
          status,
        };
      });
      setRows(mapped);
    }).catch(() => setRows([]));
  }, []);

  const saveEdit = () => {
    if (!editExam) return;
    const startDate = new Date(editExam.date);
    const endDate = new Date(startDate.getTime() + editExam.duration * 60000);
    updateExam(editExam.id, {
      title: editExam.title,
      subject: editExam.subject,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    }).then(() => {
      setRows((prev) => prev.map((e) => (e.id === editExam.id ? editExam : e)));
      toast.success(`"${editExam.title}" updated`);
      setEditExam(null);
    }).catch(() => toast.error("Failed to update exam"));
  };

  const confirmDelete = () => {
    if (!deleteExamRow) return;
    deleteExam(deleteExamRow.id).then(() => {
      setRows((prev) => prev.filter((e) => e.id !== deleteExamRow.id));
      toast.success(`"${deleteExamRow.title}" deleted`);
      setDeleteExamRow(null);
    }).catch(() => toast.error("Failed to delete exam"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage exams</h1>
        <Button asChild className="gradient-primary text-primary-foreground">
          <Link to="/teacher/create-exam"><Plus className="h-4 w-4 mr-1" /> New exam</Link>
        </Button>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Subject</TableHead>
                <TableHead>Date</TableHead><TableHead>Duration</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.subject}</TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.duration} min</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewExam(e)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditExam({ ...e })} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteExamRow(e)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No exams yet. Click "New exam" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={!!viewExam} onOpenChange={(o) => !o && setViewExam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewExam?.title}</DialogTitle>
            <DialogDescription>Exam details and configuration</DialogDescription>
          </DialogHeader>
          {viewExam && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail icon={<BookOpen className="h-4 w-4" />} label="Subject" value={viewExam.subject} />
              <Detail icon={<Calendar className="h-4 w-4" />} label="Date" value={viewExam.date} />
              <Detail icon={<Clock className="h-4 w-4" />} label="Duration" value={`${viewExam.duration} min`} />
              <Detail icon={<FileQuestion className="h-4 w-4" />} label="Questions" value={String(viewExam.questions)} />
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize">{viewExam.status}</Badge>
                {viewExam.score !== undefined && (
                  <span className="ml-auto text-muted-foreground">Avg score: <b className="text-foreground">{viewExam.score}%</b></span>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewExam(null)}>Close</Button>
            <Button onClick={() => { if (viewExam) { setEditExam({ ...viewExam }); setViewExam(null); } }}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editExam} onOpenChange={(o) => !o && setEditExam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit exam</DialogTitle>
            <DialogDescription>Update exam information and save changes.</DialogDescription>
          </DialogHeader>
          {editExam && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-title">Title</Label>
                <Input id="e-title" value={editExam.title}
                  onChange={(ev) => setEditExam({ ...editExam, title: ev.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-subject">Subject</Label>
                <Input id="e-subject" value={editExam.subject}
                  onChange={(ev) => setEditExam({ ...editExam, subject: ev.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-date">Date</Label>
                  <Input id="e-date" type="date" value={editExam.date}
                    onChange={(ev) => setEditExam({ ...editExam, date: ev.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-dur">Duration (min)</Label>
                  <Input id="e-dur" type="number" min={5} value={editExam.duration}
                    onChange={(ev) => setEditExam({ ...editExam, duration: Number(ev.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-qn">Questions</Label>
                  <Input id="e-qn" type="number" min={1} value={editExam.questions}
                    onChange={(ev) => setEditExam({ ...editExam, questions: Number(ev.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editExam.status}
                    onValueChange={(v) => setEditExam({ ...editExam, status: v as ExamRow["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExam(null)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteExamRow} onOpenChange={(o) => !o && setDeleteExamRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete exam?</DialogTitle>
            <DialogDescription>
              This will permanently remove "{deleteExamRow?.title}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExamRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
