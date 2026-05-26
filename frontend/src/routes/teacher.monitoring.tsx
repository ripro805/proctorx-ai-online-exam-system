import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProctoring } from "@/context/proctoring-context";
import { LiveAlertsFeed } from "@/components/proctoring/live-alerts-feed";
import { Camera, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getTeacherActiveStudents } from "@/lib/api";

export const Route = createFileRoute("/teacher/monitoring")({ component: MonitoringPage });

function MonitoringPage() {
  const { events, liveFrames } = useProctoring();
  const { user } = useAuth();
  const [activeStudents, setActiveStudents] = useState<any[]>([]);

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

  // Merge mock students with any live student whose webcam frame we have.
  const studentTiles = useMemo(() => {
    const base = activeStudents.map((s) => ({
      id: String(s.student_id),
      name: s.student_name,
      warningsSeed: s.warning_count ?? 0,
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
  }, [liveFrames, user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live monitoring</h1>
        <p className="text-muted-foreground">
          Real-time AI proctoring across all active exams. Live webcam feeds appear automatically when a student starts an exam.
        </p>
      </div>

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
          return (
            <Card key={s.id} className={cn("border-2 transition-colors", color)}>
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
