import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { createExam } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/create-exam")({ component: CreateExamPage });

function CreateExamPage() {
  const [publish, setPublish] = useState(false);
  const [subject, setSubject] = useState("Computer Science");
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Create exam</h1>
        <p className="text-muted-foreground">Configure a new proctored examination.</p>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const title = String(form.get("title") ?? "");
        const description = String(form.get("description") ?? "");
        const subjectValue = subject || "General";
        const duration = Number(form.get("duration") ?? 60);
        const dateTime = String(form.get("date") ?? "");
        const start = dateTime ? new Date(dateTime) : new Date();
        const end = new Date(start.getTime() + duration * 60000);
        createExam({
          title,
          description,
          subject: subjectValue,
          duration_minutes: duration,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          is_published: publish,
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
              <div className="space-y-2"><Label htmlFor="date">Scheduled date</Label><Input id="date" name="date" type="datetime-local" /></div>
              <div className="space-y-2"><Label htmlFor="qn">Number of questions</Label><Input id="qn" type="number" defaultValue={30} min={1} /></div>
            </div>
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
