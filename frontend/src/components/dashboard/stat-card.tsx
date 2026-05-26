import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title, value, icon: Icon, trend, accent,
}: { title: string; value: string | number; icon: LucideIcon; trend?: string; accent?: "primary" | "success" | "warning" | "destructive" }) {
  const accentMap = {
    primary: "from-primary/20 to-primary/0 text-primary",
    success: "from-success/20 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    destructive: "from-destructive/20 to-destructive/0 text-destructive",
  };
  const cls = accentMap[accent ?? "primary"];
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-card">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", cls.split(" ").slice(0, 2).join(" "))} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={cn("rounded-lg p-2.5 bg-background/60 backdrop-blur", cls.split(" ").pop())}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
