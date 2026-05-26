import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, AlertTriangle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminSecurityAlerts } from "@/lib/api";

export const Route = createFileRoute("/admin/security")({ component: SecurityLogsPage });

function iconFor(level: string) {
  if (level === "high" || level === "critical") return AlertTriangle;
  if (level === "medium" || level === "warning") return ShieldAlert;
  return Lock;
}

function SecurityLogsPage() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    getAdminSecurityAlerts().then((data) => setEvents(data.alerts ?? [])).catch(() => setEvents([]));
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security logs</h1>
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2">
          {events.map((e) => {
            const Icon = iconFor(e.severity);
            const level = e.severity === "high" ? "critical" : e.severity === "medium" ? "warning" : "info";
            return (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <Icon className={`h-4 w-4 ${level === "critical" ? "text-destructive" : level === "warning" ? "text-warning" : "text-muted-foreground"}`} />
                <span className="text-xs font-mono text-muted-foreground">{new Date(e.time).toLocaleTimeString()}</span>
                <Badge className={`border-0 text-[10px] ${
                  level === "critical" ? "bg-destructive/20 text-destructive"
                  : level === "warning" ? "bg-warning/20 text-warning"
                  : "bg-muted text-muted-foreground"
                }`}>{level}</Badge>
                <span className="font-medium text-sm">{e.who}</span>
                <span className="text-sm text-muted-foreground">{e.what}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
