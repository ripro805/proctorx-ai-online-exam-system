import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye, Brain, Lock, BarChart3, Zap, ShieldCheck, Camera, FileCheck,
  Users, Bell, Code, Globe,
} from "lucide-react";

export const Route = createFileRoute("/_public/features")({
  component: FeaturesPage,
  head: () => ({ meta: [{ title: "Features — ProctorX AI" }, { name: "description", content: "Explore AI proctoring, secure browser lockdown, analytics and more." }] }),
});

const groups = [
  {
    title: "AI Proctoring",
    items: [
      { icon: Eye, title: "Gaze tracking", desc: "Detects when candidates look off-screen for sustained periods." },
      { icon: Camera, title: "Multi-face detection", desc: "Flags when more than one person is present in the frame." },
      { icon: Brain, title: "Behavior modeling", desc: "ML model learns baseline behavior and surfaces anomalies." },
    ],
  },
  {
    title: "Exam Security",
    items: [
      { icon: Lock, title: "Browser lockdown", desc: "Fullscreen, copy-paste, and right-click prevention." },
      { icon: Bell, title: "Tab-switch alerts", desc: "Instant warnings when the candidate leaves the exam window." },
      { icon: ShieldCheck, title: "ID verification", desc: "Photo ID match with liveness check before exam starts." },
    ],
  },
  {
    title: "For Educators",
    items: [
      { icon: FileCheck, title: "Question bank", desc: "Tag, version, and randomize from a central question library." },
      { icon: BarChart3, title: "Integrity reports", desc: "Per-student timeline of every flagged event with evidence." },
      { icon: Zap, title: "Auto-grading", desc: "Objective scoring and rubric-based assistance for essays." },
    ],
  },
  {
    title: "Platform",
    items: [
      { icon: Users, title: "Role-based access", desc: "Granular permissions for admins, teachers, and proctors." },
      { icon: Code, title: "API & webhooks", desc: "Integrate with your LMS, SIS, or identity provider." },
      { icon: Globe, title: "Global edge delivery", desc: "Low-latency exam delivery to candidates worldwide." },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">Built for high-stakes assessment</h1>
        <p className="mt-4 text-muted-foreground">Every feature you need to deliver fair, secure, and scalable exams.</p>
      </div>
      <div className="space-y-12">
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="text-2xl font-bold mb-6">{g.title}</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {g.items.map((f) => (
                <Card key={f.title} className="border-border/60 hover:border-primary/40 transition-all">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
