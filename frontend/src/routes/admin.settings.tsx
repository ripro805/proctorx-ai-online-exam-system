import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getSystemSettings, updateSystemSettings } from "@/lib/api";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const [org, setOrg] = useState({ institution_name: "", support_email: "" });
  const [policy, setPolicy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getSystemSettings().then((data) => {
      setOrg({ institution_name: data.institution_name ?? "", support_email: data.support_email ?? "" });
      setPolicy(data.proctoring_policy ?? {});
    }).catch(() => {
      setOrg({ institution_name: "", support_email: "" });
      setPolicy({});
    });
  }, []);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">System settings</h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            updateSystemSettings({ institution_name: org.institution_name, support_email: org.support_email, proctoring_policy: policy })
              .then(() => toast.success("Settings saved"))
              .catch(() => toast.error("Failed to save settings"));
          }}>
            <div className="space-y-2"><Label>Institution name</Label><Input value={org.institution_name} onChange={(e) => setOrg((p) => ({ ...p, institution_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Support email</Label><Input value={org.support_email} onChange={(e) => setOrg((p) => ({ ...p, support_email: e.target.value }))} /></div>
            <Button type="submit" className="gradient-primary text-primary-foreground">Save</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Global proctoring policy</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/60">
          {[
            "Require ID verification before every exam",
            "Auto-flag exams with >3 warnings",
            "Record session evidence",
            "Enable AI behavior modeling",
          ].map((s) => (
            <div key={s} className="flex items-center justify-between py-3">
              <Label className="font-medium">{s}</Label>
              <Switch checked={policy[s] ?? true} onCheckedChange={(val) => setPolicy((p) => ({ ...p, [s]: val }))} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
