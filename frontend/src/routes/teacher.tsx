import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { teacherNav } from "@/data/nav";

export const Route = createFileRoute("/teacher")({
  component: TeacherRoot,
});

function TeacherRoot() {
  return (
    <DashboardLayout role="teacher" items={teacherNav} label="Educator Portal">
      <Outlet />
    </DashboardLayout>
  );
}
