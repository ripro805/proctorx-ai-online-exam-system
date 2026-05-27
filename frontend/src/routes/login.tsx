import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useAuth, dashboardPathFor, type Role } from "@/context/auth-context";
import { resetPassword } from "@/lib/api";
import { toast } from "sonner";


export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login — ProctorX AI" }] }),
});

function LoginPage() {
  const { login, logout, user, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoEmails: Record<Role, string> = {
    student: "rifatrizviofficial001@gmail.com",
    teacher: "teacher@demo.com",
    admin: "admin@proctorxai.com",
  };

  const demoPasswords: Record<Role, string> = {
    student: "Ripro@123",
    teacher: "Prova@123",
    admin: "admin123",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      navigate({ to: dashboardPathFor(u.role) as any });
    } catch (err) {
      toast.error("Unable to sign in. Please check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 hero-bg">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-glow">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ProctorX <span className="gradient-text">AI</span></span>
        </Link>
        <Card className="border-border/60 shadow-glow glass">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your ProctorX AI account.</p>
            <form onSubmit={submit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground shadow-glow">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setShowReset((prev) => !prev)}
              >
                Forgot password?
              </button>
            </div>

            {showReset && (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div>
                  <h2 className="font-semibold">Reset password</h2>
                  <p className="text-xs text-muted-foreground">Enter your email and choose a new password.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input id="reset-password" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm">Confirm password</Label>
                  <Input id="reset-confirm" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={resetLoading}
                  onClick={async () => {
                    const emailValue = resetEmail.trim();
                    const newPass = resetNewPassword.trim();
                    const confirmPass = resetConfirmPassword.trim();
                    if (!emailValue || !newPass || !confirmPass) {
                      toast.error("Please fill in all reset fields.");
                      return;
                    }
                    setResetLoading(true);
                    try {
                      await resetPassword({ email: emailValue, password: newPass, confirmPassword: confirmPass });
                      toast.success("Password updated. You can sign in now.");
                      setShowReset(false);
                      setResetEmail("");
                      setResetNewPassword("");
                      setResetConfirmPassword("");
                    } catch (err: any) {
                      const message = typeof err?.message === "string" && err.message.trim() ? err.message : "Failed to reset password.";
                      toast.error(message);
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                >
                  {resetLoading ? "Updating…" : "Reset password"}
                </Button>
              </div>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Dev quick login</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(["student", "teacher", "admin"] as Role[]).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await logout();
                        const u = await login(demoEmails[r], demoPasswords[r]);
                        toast.success(`Logged in as ${u.name}`);
                        navigate({ to: dashboardPathFor(r) as any });
                      } catch (err) {
                        toast.error("Quick login failed. Make sure the backend is running.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm text-center text-muted-foreground">
              No account? <Link to="/register" className="text-primary hover:underline">Create one</Link>
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

