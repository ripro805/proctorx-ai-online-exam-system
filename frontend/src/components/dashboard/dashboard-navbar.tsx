import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Search, Moon, Sun, LogOut, User, Settings, Activity } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSecurityAlerts, getStudentNotifications } from "@/lib/api";

export function DashboardNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const initials = user?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";
  const [notes, setNotes] = useState<Array<{ id: string; text: string; time: string }>>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "student") {
      getStudentNotifications().then((data) => setNotes((data.notifications ?? []).map((n: any) => ({
        id: n.id,
        text: n.text,
        time: n.time,
      })))).catch(() => setNotes([]));
    } else if (user.role === "admin") {
      getAdminSecurityAlerts().then((data) => setNotes((data.alerts ?? []).map((a: any) => ({
        id: a.id,
        text: a.what,
        time: a.time,
      })))).catch(() => setNotes([]));
    } else {
      setNotes([]);
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4">
      <SidebarTrigger />
      <div className="relative hidden md:block flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search exams, students, reports…" className="pl-9 bg-muted/40 border-0" />
      </div>
      <div className="flex-1 md:hidden" />
      <Badge variant="outline" className="hidden sm:flex gap-1.5 border-success/40 text-success">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <Activity className="h-3 w-3" /> AI Monitoring Active
      </Badge>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notes.length === 0 ? (
            <DropdownMenuItem className="flex-col items-start gap-1 py-2">
              <span className="text-sm text-muted-foreground">No notifications</span>
            </DropdownMenuItem>
          ) : notes.map((n) => (
            <DropdownMenuItem key={n.id} className="flex-col items-start gap-1 py-2">
              <span className="text-sm">{n.text}</span>
              <span className="text-xs text-muted-foreground">{new Date(n.time).toLocaleString()}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start text-xs leading-tight">
              <span className="font-medium">{user?.name}</span>
              <span className="text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to={`/${user?.role}/dashboard`}><Activity className="mr-2 h-4 w-4" />Dashboard</Link>
          </DropdownMenuItem>
          {user?.role === "student" && (
            <>
              <DropdownMenuItem asChild><Link to="/student/profile"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/student/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await logout(); navigate({ to: "/login" }); }}>
            <LogOut className="mr-2 h-4 w-4" />Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
