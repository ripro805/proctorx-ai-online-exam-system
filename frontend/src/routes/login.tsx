import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useAuth, dashboardPathFor, type Role } from "@/context/auth-context";
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
  const [loading, setLoading] = useState(false);

  const demoEmails: Record<Role, string> = {
    student: "student1@demo.com",
    teacher: "teacher@demo.com",
    admin: "admin@demo.com",
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
                        const u = await login(demoEmails[r], "demo1234");
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

