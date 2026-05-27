import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { getProfile, updateProfile } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/student/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const initials = (profile?.name ?? user?.name ?? "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">My profile</h1>
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="gradient-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{profile?.name ?? user?.name}</h2>
            <p className="text-muted-foreground">{profile?.email ?? user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role} · ID #{user?.id.slice(0, 8)}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-2 gap-4" onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const passwordFields = {
              current_password: String(form.get("current_password") ?? "").trim(),
              new_password: String(form.get("new_password") ?? "").trim(),
              confirm_new_password: String(form.get("confirm_new_password") ?? "").trim(),
            };
            const passwordRequested = Object.values(passwordFields).some(Boolean);
            const payload: Record<string, unknown> = {
              name: form.get("name"),
              email: form.get("email"),
              phone_number: form.get("phone_number"),
              institution: form.get("institution"),
              student_id: form.get("student_id"),
              ...(passwordRequested ? passwordFields : {}),
            };
            updateProfile(payload).then((data) => {
              setProfile(data);
              updateUser({
                name: data.name,
                email: data.email,
                phone_number: data.phone_number,
              });
              toast.success("Profile updated");
            }).catch(() => toast.error("Failed to update profile"));
          }}>
            <div className="space-y-2"><Label>Full name</Label><Input name="name" defaultValue={profile?.name ?? user?.name} /></div>
            <div className="space-y-2"><Label>Email</Label><Input name="email" defaultValue={profile?.email ?? user?.email} type="email" /></div>
            <div className="space-y-2"><Label>Phone number</Label><Input name="phone_number" defaultValue={profile?.phone_number ?? ""} type="tel" placeholder="01XXXXXXXXX" /></div>
            <div className="space-y-2"><Label>Institution</Label><Input name="institution" defaultValue={profile?.institution ?? ""} /></div>
            <div className="space-y-2"><Label>Student ID</Label><Input name="student_id" defaultValue={profile?.student_id ?? ""} /></div>
            <div className="md:col-span-2"><Button type="submit" className="gradient-primary text-primary-foreground">Save changes</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-2 gap-4" onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            updateProfile({
              current_password: form.get("current_password"),
              new_password: form.get("new_password"),
              confirm_new_password: form.get("confirm_new_password"),
            }).then(() => {
              toast.success("Password updated");
              e.currentTarget.reset();
            }).catch((err: any) => {
              const message = typeof err?.message === "string" && err.message.trim() ? err.message : "Failed to change password";
              toast.error(message);
            });
          }}>
            <div className="space-y-2"><Label>Current password</Label><Input name="current_password" type="password" placeholder="Enter current password" /></div>
            <div className="space-y-2"><Label>New password</Label><Input name="new_password" type="password" placeholder="Enter new password" /></div>
            <div className="space-y-2"><Label>Confirm new password</Label><Input name="confirm_new_password" type="password" placeholder="Repeat new password" /></div>
            <div className="md:col-span-2"><Button type="submit">Change password</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
