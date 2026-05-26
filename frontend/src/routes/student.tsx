import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { studentNav } from "@/data/nav";

export const Route = createFileRoute("/student")({
  component: StudentRoot,
});

function StudentRoot() {
  return (
    <DashboardLayout role="student" items={studentNav} label="Student Portal">
      <Outlet />
    </DashboardLayout>
  );
}
