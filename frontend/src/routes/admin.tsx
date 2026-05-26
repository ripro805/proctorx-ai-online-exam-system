import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { adminNav } from "@/data/nav";

export const Route = createFileRoute("/admin")({
  component: AdminRoot,
});

function AdminRoot() {
  return (
    <DashboardLayout role="admin" items={adminNav} label="Admin Console">
      <Outlet />
    </DashboardLayout>
  );
}
