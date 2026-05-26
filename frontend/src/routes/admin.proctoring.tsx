import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getAdminProctoring } from "@/lib/api";
import { LiveAlertsFeed } from "@/components/proctoring/live-alerts-feed";
import { Camera, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/proctoring")({ component: AdminProctoringPage });

function AdminProctoringPage() {
  const [streams, setStreams] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      getAdminProctoring().then((data) => alive && setStreams(data.streams ?? [])).catch(() => alive && setStreams([]));
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Global proctoring overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {streams.map((s) => {
          const status = s.status === "alert" ? "flagged" : s.status === "warning" ? "warning" : "active";
          const color = status === "active" ? "border-success/40" : status === "warning" ? "border-warning/40" : "border-destructive/40 shadow-glow";
          const badgeCls = status === "active" ? "bg-success/20 text-success" : status === "warning" ? "bg-warning/20 text-warning" : "bg-destructive/20 text-destructive";
          return (
            <Card key={s.id} className={cn("border-2", color)}>
              <CardContent className="p-3">
                <div className="aspect-video rounded-md bg-linear-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <div className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  <Badge className={cn("border-0 text-[10px] capitalize", badgeCls)}>{status}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  {s.flags > 0 ? <AlertTriangle className="h-3 w-3 text-warning" /> : <ShieldCheck className="h-3 w-3 text-success" />}
                  {s.flags} warning{s.flags !== 1 && "s"}
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

