import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { getStudentNotifications } from "@/lib/api";

export const Route = createFileRoute("/student/notifications")({ component: NotificationsPage });

function relTime(ts: string) {
  const diff = Date.now() - Date.parse(ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function NotificationsPage() {
  const [notes, setNotes] = useState<Array<{ id: string; text: string; time: string }>>([]);
  useEffect(() => {
    getStudentNotifications().then((data) => setNotes(data.notifications ?? [])).catch(() => setNotes([]));
  }, []);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="space-y-2">
        {notes.map((n) => (
          <Card key={n.id} className="border-border/60">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg p-2 bg-muted/40 text-primary"><Calendar className="h-4 w-4" /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between"><h3 className="font-medium">Notification</h3><span className="text-xs text-muted-foreground">{relTime(n.time)}</span></div>
                <p className="text-sm text-muted-foreground">{n.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
