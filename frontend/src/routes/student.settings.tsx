import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/lib/api";

export const Route = createFileRoute("/student/settings")({ component: SettingsPage });

const toggles = [
  { id: "n1", label: "Email notifications", desc: "Get notified about upcoming exams and results." },
  { id: "n2", label: "Browser notifications", desc: "Receive real-time alerts in your browser." },
  { id: "n3", label: "AI tutor suggestions", desc: "Receive personalized study recommendations." },
  { id: "n4", label: "Two-factor authentication", desc: "Add an extra layer of account security." },
];

function SettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    getProfile().then((data) => setPrefs(data.preferences ?? {})).catch(() => setPrefs({}));
  }, []);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/60">
          {toggles.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <Label htmlFor={t.id} className="font-medium">{t.label}</Label>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <Switch
                id={t.id}
                checked={prefs[t.id] ?? true}
                onCheckedChange={(val) => setPrefs((prev) => ({ ...prev, [t.id]: val }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground">Permanently remove your account and all data.</p>
          </div>
          <Button variant="destructive" onClick={() => toast.error("This is a demo — account deletion disabled.")}>Delete</Button>
        </CardContent>
      </Card>
        <div className="flex justify-end">
          <Button onClick={() => {
            updateProfile({ preferences: prefs }).then(() => toast.success("Settings saved"))
              .catch(() => toast.error("Failed to save settings"));
          }}>Save settings</Button>
        </div>
    </div>
  );
}
