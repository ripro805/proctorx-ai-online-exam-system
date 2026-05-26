import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_public/pricing")({
  component: PricingPage,
  head: () => ({ meta: [{ title: "Pricing — ProctorX AI" }, { name: "description", content: "Simple, transparent pricing for institutions of every size." }] }),
});

const plans = [
  {
    name: "Starter", price: "$0", period: "/mo",
    desc: "For small classes and pilots.",
    features: ["Up to 50 candidates / mo", "Basic AI proctoring", "Email support", "Standard analytics"],
    cta: "Start free",
  },
  {
    name: "Institution", price: "$299", period: "/mo", featured: true,
    desc: "For schools and universities.",
    features: ["Up to 5,000 candidates / mo", "Advanced AI proctoring", "Question bank & randomization", "Integrity reports", "Priority support"],
    cta: "Start 14-day trial",
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "For certification bodies and large orgs.",
    features: ["Unlimited candidates", "Custom AI models", "SSO + LMS integration", "Dedicated success manager", "SLA & audit logs"],
    cta: "Contact sales",
  },
];

function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">Simple, transparent pricing</h1>
        <p className="mt-4 text-muted-foreground">Pay only for what you use. Cancel anytime.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((p) => (
          <Card key={p.name} className={cn("relative border-border/60",
            p.featured && "border-primary/60 shadow-glow scale-[1.02]")}>
            {p.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-full gradient-primary text-primary-foreground font-medium">
                Most popular
              </div>
            )}
            <CardContent className="p-6">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.period}</span>
              </div>
              <Button asChild className={cn("w-full mt-6", p.featured && "gradient-primary text-primary-foreground")}
                variant={p.featured ? "default" : "outline"}>
                <Link to={p.name === "Enterprise" ? "/contact" : "/register"}>{p.cta}</Link>
              </Button>
              <ul className="mt-6 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
