import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ShieldCheck, Eye, Brain, BarChart3, Lock, Zap, ArrowRight,
  Camera, AlertTriangle, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "ProctorX AI — AI-Powered Online Examination & Proctoring" },
      { name: "description", content: "Secure, AI-proctored online examinations for institutions, educators and students." },
    ],
  }),
});

const features = [
  { icon: Eye, title: "Real-Time AI Proctoring", desc: "Computer vision detects multiple faces, gaze shifts, and suspicious motion in real time." },
  { icon: Brain, title: "Adaptive Question Banks", desc: "AI-curated question rotations prevent leaks and personalize difficulty per candidate." },
  { icon: Lock, title: "Secure Browser Lockdown", desc: "Fullscreen enforcement, tab-switch detection, and copy-paste blocking out of the box." },
  { icon: BarChart3, title: "Instant Analytics", desc: "Per-question heatmaps, integrity scores, and cohort dashboards the moment exams close." },
  { icon: Zap, title: "Auto-Grading at Scale", desc: "MCQs, code, and short-answer grading powered by ML scoring rubrics." },
  { icon: ShieldCheck, title: "Enterprise-Grade Security", desc: "SOC2-ready architecture, end-to-end encryption, and audit-grade evidence trails." },
];

function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden hero-bg">
        <div className="container mx-auto px-4 py-24 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="border-primary/40 text-primary mb-6">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Trusted by 500+ institutions worldwide
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              The future of exams is <br className="hidden md:block" />
              <span className="gradient-text">AI-proctored.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              ProctorX AI delivers tamper-proof online examinations with real-time computer vision proctoring,
              adaptive question banks, and instant integrity analytics.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-glow">
                <Link to="/register">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/features">Explore features</Link>
              </Button>
            </div>
          </motion.div>

          {/* Hero card preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-border/60 glass shadow-glow p-2">
              <div className="rounded-xl bg-background/60 p-6 grid md:grid-cols-3 gap-4 text-left">
                <div className="md:col-span-2 rounded-lg bg-muted/40 p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Question 12 of 40
                  </div>
                  <p className="font-medium">What is the time complexity of binary search on a sorted array?</p>
                  <div className="mt-4 space-y-2">
                    {["O(n)", "O(log n)", "O(n²)", "O(1)"].map((o, i) => (
                      <div key={o} className={`px-3 py-2 rounded-md border text-sm ${i === 1 ? "border-primary bg-primary/10" : "border-border"}`}>{o}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/40 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Camera className="h-3 w-3" /> Live monitoring
                    </div>
                    <div className="aspect-video rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <Badge className="mt-2 bg-success/20 text-success border-0">Identity verified</Badge>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-4 text-sm">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" /> 0 warnings
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">AI integrity score: 98%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need to run exams at scale</h2>
          <p className="mt-3 text-muted-foreground">
            Built for universities, certification bodies, and enterprise training teams.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full border-border/60 hover:border-primary/40 transition-all hover:shadow-glow">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: "500+", v: "Institutions" }, { k: "2M+", v: "Exams proctored" },
            { k: "99.98%", v: "Platform uptime" }, { k: "<200ms", v: "AI detection latency" },
          ].map((s) => (
            <div key={s.v}>
              <div className="text-3xl md:text-4xl font-bold gradient-text">{s.k}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24">
        <div className="rounded-2xl gradient-primary p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to modernize your examinations?</h2>
          <p className="mt-3 opacity-90 max-w-xl mx-auto">Get started in minutes — no credit card required.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/register">Create free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
