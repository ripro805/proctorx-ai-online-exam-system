import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProctoring } from "@/context/proctoring-context";
import { LiveAlertsFeed } from "@/components/proctoring/live-alerts-feed";
import { Camera, AlertTriangle, ShieldCheck, Video, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getTeacherActiveStudents } from "@/lib/api";

export const Route = createFileRoute("/teacher/monitoring")({ component: MonitoringPage });

function MonitoringPage() {
  const { events, liveFrames } = useProctoring();
  const { user } = useAuth();
  const [activeStudents, setActiveStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      getTeacherActiveStudents().then((data) => {
        if (alive) setActiveStudents(data.active_students ?? []);
      }).catch(() => alive && setActiveStudents([]));
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const studentRisk = useMemo(() => {
    const map = new Map<string, { warnings: number; high: number }>();
    for (const e of events) {
      const cur = map.get(e.studentId) ?? { warnings: 0, high: 0 };
      if (e.severity !== "LOW") cur.warnings += 1;
      if (e.severity === "HIGH") cur.high += 1;
      map.set(e.studentId, cur);
    }
    return map;
  }, [events]);

  const latestActivityByStudent = useMemo(() => {
    const map = new Map<string, { text: string; ts: number; type: string }>();
    for (const e of events) {
      const current = map.get(e.studentId);
      if (!current || e.timestamp > current.ts) {
        map.set(e.studentId, { text: e.message, ts: e.timestamp, type: e.type });
      }
    }
    return map;
  }, [events]);

  // Merge mock students with any live student whose webcam frame we have.
  const studentTiles = useMemo(() => {
    const base = activeStudents.map((s) => ({
      id: String(s.student_id),
      name: s.student_name,
      warningsSeed: s.warning_count ?? 0,
      examId: String(s.exam_id),
      lastEventType: s.last_event_type ?? null,
      lastEventTime: s.last_event_time ? Date.parse(s.last_event_time) || Date.now() : null,
    }));
    const knownIds = new Set(base.map((b) => b.id));
    Object.values(liveFrames).forEach((f) => {
      // Skip the teacher's own frame if they happened to publish one
      if (f.studentId === user?.id && user?.role === "teacher") return;
      if (!knownIds.has(f.studentId)) {
        base.unshift({ id: f.studentId, name: f.studentName, warningsSeed: 0 });
        knownIds.add(f.studentId);
      }
    });
    return base;
  }, [activeStudents, liveFrames, user]);

  const focusedStudent = useMemo(() => {
    if (!studentTiles.length) return null;
    const match = studentTiles.find((s) => s.id === selectedStudentId);
    return match ?? studentTiles[0];
  }, [selectedStudentId, studentTiles]);

  const selectedFrame = focusedStudent ? liveFrames[focusedStudent.id] : null;
  const selectedActivity = focusedStudent ? latestActivityByStudent.get(focusedStudent.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live monitoring</h1>
        <p className="text-muted-foreground">
          Real-time AI proctoring across all active exams. Live webcam feeds appear automatically when a student starts an exam.
        </p>
      </div>

      {focusedStudent && (
        <Card className="border-border/60 shadow-lg overflow-hidden">
          <CardContent className="p-0 grid lg:grid-cols-[2fr_1fr]">
            <div className="relative aspect-video bg-linear-to-br from-primary/20 to-accent/20 overflow-hidden">
              {selectedFrame && Date.now() - selectedFrame.ts < 15_000 ? (
                <img
                  src={selectedFrame.dataUrl}
                  alt={`${focusedStudent.name} live webcam`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <Video className="h-12 w-12" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <Badge className="bg-background/80 text-foreground border-0 gap-1">
                  <Eye className="h-3 w-3" /> {focusedStudent.name}
                </Badge>
                <Badge className={cn("border-0", selectedFrame ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                  {selectedFrame ? "LIVE VIDEO" : "OFFLINE"}
                </Badge>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                <div className="bg-background/80 backdrop-blur px-3 py-2 rounded-md max-w-[70%]">
                  <div className="text-sm font-semibold truncate">{focusedStudent.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedActivity?.text ?? (selectedFrame ? "Camera feed active" : "Waiting for webcam frame")}
                  </div>
                </div>
                <div className="bg-background/80 backdrop-blur px-3 py-2 rounded-md text-right">
                  <div className="text-xs text-muted-foreground">Current status</div>
                  <div className="text-sm font-semibold">
                    {selectedFrame ? "Monitoring live" : "No live frame"}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 border-t lg:border-t-0 lg:border-l border-border/60">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Student details</div>
                <div className="text-lg font-semibold">{focusedStudent.name}</div>
                <div className="text-xs text-muted-foreground">Exam #{focusedStudent.examId}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-success/20 text-success border-0">{selectedFrame ? "Camera active" : "Camera pending"}</Badge>
                <Badge className="bg-warning/20 text-warning border-0">{(studentRisk.get(focusedStudent.id)?.warnings ?? focusedStudent.warningsSeed) || 0} warnings</Badge>
                {focusedStudent.lastEventType && (
                  <Badge className="bg-muted text-muted-foreground border-0">Last: {humanizeEvent(focusedStudent.lastEventType)}</Badge>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm space-y-1">
                <div className="font-medium">What the student is doing</div>
                <div className="text-muted-foreground">
                  {selectedActivity?.text
                    ?? (selectedFrame ? "Live webcam feed active and being monitored." : "Awaiting live webcam connection from the student.")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedActivity ? `Updated ${Math.max(0, Math.floor((Date.now() - selectedActivity.ts) / 1000))}s ago` : "No recent action yet"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {studentTiles.map((s) => {
          const risk = studentRisk.get(s.id);
          const warnings = (risk?.warnings ?? 0) + s.warningsSeed;
          const status: "active" | "warning" | "flagged" =
            (risk?.high ?? 0) > 0 || warnings >= 4 ? "flagged"
            : warnings >= 1 ? "warning"
            : "active";
          const color = status === "active" ? "border-success/40" : status === "warning" ? "border-warning/40" : "border-destructive/40 shadow-glow";
          const badgeCls = status === "active" ? "bg-success/20 text-success" : status === "warning" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive";
          const label = status === "active" ? "Normal" : status === "warning" ? "Warning" : "High Risk";
          const frame = liveFrames[s.id];
          const isLive = frame && Date.now() - frame.ts < 15_000;
          const activity = latestActivityByStudent.get(s.id);
          return (
            <Card
              key={s.id}
              className={cn("border-2 transition-colors cursor-pointer", color, selectedStudentId === s.id && "ring-2 ring-primary")}
              onClick={() => setSelectedStudentId(s.id)}
            >
              <CardContent className="p-3">
                <div className="aspect-video rounded-md overflow-hidden bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                  {isLive ? (
                    <img
                      src={frame.dataUrl}
                      alt={`${s.name} webcam`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className={cn(
                    "absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full animate-pulse",
                    isLive ? "bg-destructive" : "bg-muted-foreground/60",
                  )} />
                  <div className="absolute bottom-1.5 left-1.5 text-[10px] bg-background/80 px-1.5 rounded">
                    {isLive ? "LIVE" : "OFFLINE"}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  <Badge className={cn("border-0 text-[10px]", badgeCls)}>{label}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {isLive ? "Live video active" : "Waiting for webcam"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-10">
                  {activity?.text ?? (s.lastEventType ? humanizeEvent(String(s.lastEventType)) : "No recent activity")}
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  {warnings > 0 ? <AlertTriangle className="h-3 w-3 text-warning" /> : <ShieldCheck className="h-3 w-3 text-success" />}
                  {warnings} warning{warnings !== 1 && "s"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LiveAlertsFeed />
    </div>
  );
}

function humanizeEvent(eventType: string | null | undefined) {
  switch (String(eventType || "").toLowerCase()) {
    case "no_face":
      return "No face detected";
    case "multiple_faces":
      return "Multiple faces detected";
    case "face_not_centered":
      return "Face detected";
    case "tab_switch":
      return "Tab switch detected";
    case "fullscreen_exit":
      return "Exited fullscreen";
    case "copy_attempt":
      return "Copy attempt blocked";
    case "paste_attempt":
      return "Paste attempt blocked";
    case "right_click":
      return "Right click blocked";
    default:
      return eventType ? String(eventType).replace(/_/g, " ") : "No recent activity";
  }
}
