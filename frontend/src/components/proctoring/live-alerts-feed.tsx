import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProctoring, type ProctoringSeverity } from "@/context/proctoring-context";
import { AlertTriangle, ShieldAlert, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const sevStyle: Record<ProctoringSeverity, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-warning/20 text-warning",
  HIGH: "bg-destructive/20 text-destructive",
};

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

interface Props {
  title?: string;
  max?: number;
  className?: string;
}

export function LiveAlertsFeed({ title = "Live proctoring alerts", max = 25, className }: Props) {
  const { events } = useProctoring();
  // Re-render every 30s so relative times stay fresh
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

  const items = events.slice(0, max);

  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <Badge variant="outline" className="gap-1 border-success/40 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-72 pr-2">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No events yet.</div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((e) => {
                const Icon = e.severity === "HIGH" ? ShieldAlert : AlertTriangle;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0"
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        e.severity === "HIGH" ? "text-destructive" : e.severity === "MEDIUM" ? "text-warning" : "text-muted-foreground",
                      )}
                    />
                    <Badge className={cn("border-0 text-[10px] uppercase", sevStyle[e.severity])}>
                      {e.severity}
                    </Badge>
                    <span className="text-sm font-medium truncate">{e.studentName}</span>
                    <span className="text-sm text-muted-foreground truncate flex-1">{e.message}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{relTime(e.timestamp)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
