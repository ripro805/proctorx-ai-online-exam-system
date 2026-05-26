import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Heart, Zap } from "lucide-react";

export const Route = createFileRoute("/_public/about")({
  component: AboutPage,
  head: () => ({ meta: [{ title: "About — ProctorX AI" }, { name: "description", content: "Our mission is to make high-stakes online exams fair, secure, and accessible." }] }),
});

function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-bold text-center">About ProctorX AI</h1>
      <p className="mt-6 text-lg text-muted-foreground text-center">
        We're a team of educators, ML engineers, and security researchers building the next generation
        of online assessment. Our mission is simple: make high-stakes exams fair, accessible, and tamper-proof.
      </p>
      <div className="mt-12 grid md:grid-cols-3 gap-4">
        {[
          { icon: Target, title: "Our Mission", desc: "Equal access to credible assessments, anywhere in the world." },
          { icon: Heart, title: "Our Values", desc: "Privacy by design, transparency in AI, and trust through evidence." },
          { icon: Zap, title: "Our Edge", desc: "On-device computer vision keeps data local while delivering instant alerts." },
        ].map((v) => (
          <Card key={v.title} className="border-border/60">
            <CardContent className="p-6">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <v.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-16 prose dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold">The story</h2>
        <p className="text-muted-foreground">
          ProctorX AI was founded in 2024 when our team — having built remote proctoring tools at scale —
          realized that existing solutions were either too invasive or too easy to cheat around. We set out
          to build something different: a system that respects candidate privacy while delivering rock-solid
          integrity guarantees through modern machine learning.
        </p>
        <p className="text-muted-foreground">
          Today we serve universities, certification bodies, and enterprise training teams in over 40 countries.
        </p>
      </div>
    </div>
  );
}
