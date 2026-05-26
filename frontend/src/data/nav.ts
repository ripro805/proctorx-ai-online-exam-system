import {
  LayoutDashboard, BookOpen, Clock, CheckCircle2, TrendingUp,
  Bell, User, Settings, HelpCircle,
} from "lucide-react";
import type { NavItem } from "@/components/dashboard/dashboard-sidebar";

export const studentNav: NavItem[] = [
  { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Exams", url: "/student/exams", icon: BookOpen },
  { title: "Ongoing", url: "/student/ongoing", icon: Clock },
  { title: "Results", url: "/student/results", icon: TrendingUp },
  { title: "Notifications", url: "/student/notifications", icon: Bell },
  { title: "Profile", url: "/student/profile", icon: User },
  { title: "Settings", url: "/student/settings", icon: Settings },
  { title: "Help & Support", url: "/student/help", icon: HelpCircle },
];

import {
  LayoutDashboard as L2, PlusCircle, FileText, Library, Users,
  Eye, BarChart3, FileBarChart,
} from "lucide-react";

export const teacherNav: NavItem[] = [
  { title: "Dashboard", url: "/teacher/dashboard", icon: L2 },
  { title: "Create Exam", url: "/teacher/create-exam", icon: PlusCircle },
  { title: "Manage Exams", url: "/teacher/manage-exams", icon: FileText },
  { title: "Question Bank", url: "/teacher/questions", icon: Library },
  { title: "Students", url: "/teacher/students", icon: Users },
  { title: "Monitoring", url: "/teacher/monitoring", icon: Eye },
  { title: "Results", url: "/teacher/results", icon: BarChart3 },
  { title: "Reports", url: "/teacher/reports", icon: FileBarChart },
];

import {
  LayoutDashboard as L3, Users as U2, GraduationCap, FileText as F2,
  Eye as E2, ShieldAlert, Activity, Settings as S2,
} from "lucide-react";

export const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: L3 },
  { title: "Users", url: "/admin/users", icon: U2 },
  { title: "Teachers", url: "/admin/teachers", icon: GraduationCap },
  { title: "Exams", url: "/admin/exams", icon: F2 },
  { title: "Proctoring", url: "/admin/proctoring", icon: E2 },
  { title: "Security Logs", url: "/admin/security", icon: ShieldAlert },
  { title: "Analytics", url: "/admin/analytics", icon: Activity },
  { title: "Settings", url: "/admin/settings", icon: S2 },
];
