import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_public/faq")({
  component: FAQPage,
  head: () => ({ meta: [{ title: "FAQ — ProctorX AI" }, { name: "description", content: "Frequently asked questions about ProctorX AI." }] }),
});

const faqs = [
  { q: "How does AI proctoring work?", a: "ProctorX uses on-device computer vision to detect faces, gaze direction, and suspicious motion in real time. All processing happens client-side; we only upload short evidence clips when an event is flagged." },
  { q: "Is candidate data private?", a: "Yes. Video is processed locally by default; only flagged events generate evidence that's encrypted in transit and at rest. We're SOC2-ready and GDPR-compliant." },
  { q: "Can it integrate with our LMS?", a: "ProctorX has native LTI 1.3 support and a REST API for deeper integrations with Canvas, Moodle, Blackboard, and custom systems." },
  { q: "What devices are supported?", a: "Any modern browser on desktop or laptop with a webcam. Mobile is supported for review and monitoring but not exam-taking." },
  { q: "How accurate is the AI?", a: "Our detection model achieves 97.4% recall on standard cheating indicators with a <2% false positive rate. Every flag includes evidence for human review." },
  { q: "Do you offer onboarding?", a: "Institution and Enterprise plans include dedicated onboarding, training sessions, and a customer success manager." },
];

function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-bold text-center">Frequently asked questions</h1>
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
