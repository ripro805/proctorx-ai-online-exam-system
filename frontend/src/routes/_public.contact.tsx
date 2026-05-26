import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/contact")({
  component: ContactPage,
  head: () => ({ meta: [{ title: "Contact — ProctorX AI" }, { name: "description", content: "Get in touch with the ProctorX AI team." }] }),
});

function ContactPage() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">Get in touch</h1>
        <p className="mt-4 text-muted-foreground">We typically respond within one business day.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          {[
            { icon: Mail, title: "Email", value: "hello@proctorx.ai" },
            { icon: Phone, title: "Phone", value: "+1 (555) 010-2024" },
            { icon: MapPin, title: "Office", value: "San Francisco, CA" },
          ].map((c) => (
            <Card key={c.title} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                  <c.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{c.title}</div>
                  <div className="font-medium text-sm">{c.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="md:col-span-2 border-border/60">
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLoading(true);
                setTimeout(() => { setLoading(false); toast.success("Message sent! We'll get back to you soon."); (e.target as HTMLFormElement).reset(); }, 800);
              }}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" required /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" required /></div>
              <div className="space-y-2"><Label htmlFor="msg">Message</Label><Textarea id="msg" rows={5} required /></div>
              <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
                {loading ? "Sending…" : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
