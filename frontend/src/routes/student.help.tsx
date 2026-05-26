import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, BookOpen } from "lucide-react";

export const Route = createFileRoute("/student/help")({ component: HelpPage });

const items = [
  { q: "How does proctoring work?", a: "Your webcam is used to verify identity and monitor for suspicious activity during the exam. All processing is on-device by default." },
  { q: "What if my internet drops?", a: "Your answers auto-save every 5 seconds. Reconnect within 60 seconds to resume seamlessly." },
  { q: "Can I review past exams?", a: "Yes — visit Results to see your scores and per-question breakdowns." },
];

function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Help & Support</h1>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { icon: BookOpen, title: "Knowledge base", desc: "Browse guides and tutorials" },
          { icon: MessageCircle, title: "Live chat", desc: "Chat with support 24/7" },
          { icon: Mail, title: "Email support", desc: "support@proctorx.ai" },
        ].map((c) => (
          <Card key={c.title} className="border-border/60 hover:border-primary/40 cursor-pointer transition-all">
            <CardContent className="p-4">
              <c.icon className="h-5 w-5 text-primary mb-2" />
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/60">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2">FAQs</h2>
          <Accordion type="single" collapsible>
            {items.map((i, k) => (
              <AccordionItem key={k} value={`f${k}`}>
                <AccordionTrigger>{i.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{i.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      <Button className="gradient-primary text-primary-foreground">Contact support</Button>
    </div>
  );
}
