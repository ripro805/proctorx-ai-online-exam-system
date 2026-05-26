import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type Role } from "@/context/auth-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar, type NavItem } from "@/components/dashboard/dashboard-sidebar";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";

export function DashboardLayout({
  role, items, label, children,
}: { role: Role; items: NavItem[]; label: string; children: ReactNode }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (user.role !== role) { navigate({ to: `/${user.role}/dashboard` as any }); }
  }, [user, ready, role, navigate]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardSidebar items={items} label={label} />
      <SidebarInset>
        <DashboardNavbar />
        <main className="flex-1 p-4 md:p-6 animate-fade-in">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
