import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Mic, Send, Sparkles, Brain, MessageSquareText, History, Zap, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/ai/markdown-renderer";
import { getAiConversation, getAiConversations, getAiPerformanceAnalysis, getStoredAccessToken, sendAiChatMessage, wsUrl, getStudentExams } from "@/lib/api";

export const Route = createFileRoute("/student/ai-tutor")({ component: AiTutorPage });

type ChatMessage = { role: "user" | "assistant"; content: string; provider?: string; fallback?: boolean };

type Conversation = { id: number; title: string; subject?: string; mode?: string; updated_at?: string; messages?: Array<{ role: string; content: string }> };

function AiTutorPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I’m your AI Tutor. Ask me anything about your exams, weak topics, or study plan." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAiConversations();
        const convs = data.conversations ?? [];
        setConversations(convs);
        if (convs.length > 0) {
          const first = convs[0];
          setSelectedConversation(first.id);
          try {
            const detail = await getAiConversation(String(first.id));
            const msgs = (detail.conversation?.messages ?? []).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
            setMessages(msgs.length ? msgs : [{ role: 'assistant', content: 'Hi! I\u2019m your AI Tutor. Ask me anything.' }]);
          } catch {
            // ignore detail fetch errors
          }
        }
      } catch {
        setConversations([]);
      }
      try {
        const examData = await getStudentExams();
        // Prefer authoritative has_active_session flag from the API when available.
        const ongoing = typeof examData.has_active_session === 'boolean'
          ? examData.has_active_session
          : (examData.exams ?? []).some((e: any) => e.status === "ongoing");
        setIsExamActive(ongoing);
      } catch {
        setIsExamActive(false);
      }
      try {
        const analysisData = await getAiPerformanceAnalysis();
        setAnalysis(analysisData);
      } catch {
        setAnalysis(null);
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    const ws = new WebSocket(wsUrl("/ws/ai-tutor/", token));
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "chunk") {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            last.content += payload.delta ?? "";
            return [...next.slice(0, -1), last];
          }
          return [...next, { role: "assistant", content: payload.delta ?? "", provider: payload.provider, fallback: payload.fallback }];
        });
      }
      if (payload.type === "done") {
        setStreaming(false);
        setConversations((prev) => prev.map((c) => c.id === payload.conversation_id ? { ...c, updated_at: new Date().toISOString() } : c));
      }
      if (payload.type === "error") {
        toast.error(payload.detail ?? "AI Tutor error");
        setStreaming(false);
      }
    };
    ws.onerror = () => setStreaming(false);
    return () => { ws.close(); wsRef.current = null; };
  }, []);

  const suggestedPrompts = useMemo(() => [
    "Explain the last topic in simple terms",
    "Create a 5-minute revision plan for today",
    "Give me 5 MCQs from my weak subjects",
    "Summarize the key formulas I should remember",
  ], []);

  const weakSubjects = analysis?.weak_subjects ?? [];

  const sendMessage = async (text: string, action: "chat" | "voice" = "chat") => {
    const message = text.trim();
    if (!message || streaming) return;
    setPrompt("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action, message, conversation_id: selectedConversation, subject: weakSubjects[0]?.subject ?? "" }));
      } else {
        const res = await sendAiChatMessage({ message, conversationId: selectedConversation ? String(selectedConversation) : undefined, subject: weakSubjects[0]?.subject ?? "", action });
        const textResponse = res?.response?.text ?? res?.response?.content ?? res?.response?.message ?? res?.response?.text ?? "";
        setMessages((prev) => prev.slice(0, -1).concat({ role: "assistant", content: textResponse, provider: res?.response?.provider, fallback: res?.response?.fallback }));
        setStreaming(false);
      }
      const refreshed = await getAiConversations();
      setConversations(refreshed.conversations ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send AI message");
      setStreaming(false);
      setMessages((prev) => prev.slice(0, -1));
    }
  };

  const activateVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(" ");
      void sendMessage(transcript, "voice");
    };
    recognition.start();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Tutor</h1>
          <p className="text-muted-foreground">Chat, practice, and learn with the AI companion built into your exam dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/15 text-primary border-0"><Sparkles className="mr-1 h-3 w-3" /> Multi-AI fallback active</Badge>
          <Badge variant="outline">Gemini → OpenAI → Groq</Badge>
        </div>
      </div>
      {isExamActive && (
        <Card className="border-destructive/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI temporarily disabled</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">AI Tutor is disabled during an active exam session to protect exam integrity. Return to <Link to="/student/ongoing">Ongoing exams</Link> to view or start exams.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_300px]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Chat history</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-155 pr-3">
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${selectedConversation === conversation.id ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{conversation.title || "Untitled chat"}</div>
                        <div className="text-xs text-muted-foreground">{conversation.subject || "General"}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{conversation.mode ?? "chat"}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{conversation.messages?.length ?? 0} messages</div>
                  </button>
                ))}
                {conversations.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No AI chats yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-border/60 overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Conversation</CardTitle>
                <p className="text-xs text-muted-foreground">Typing effect, voice support, and markdown rendering.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { if (!isExamActive) activateVoice(); }} disabled={isExamActive}>
                  <Mic className={`mr-1 h-4 w-4 ${listening ? "animate-pulse text-destructive" : ""}`} /> {listening ? "Listening…" : "Voice"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { if (!isExamActive) setMessages([{ role: "assistant", content: "Fresh start — ask me anything." }]); }} disabled={isExamActive}>
                  New chat
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-135 px-4 py-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl border px-4 py-3 ${message.role === "user" ? "border-primary/30 bg-primary/10" : "border-border/60 bg-muted/30"}`}>
                        {message.role === "assistant" ? (
                          <MarkdownRenderer content={message.content || (streaming && index === messages.length - 1 ? "..." : "")} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        )}
                        {message.role === "assistant" && message.content === "" && streaming && index === messages.length - 1 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-border/60 p-4">
              <div className="flex flex-wrap gap-2 pb-3">
                {suggestedPrompts.map((prompt) => (
                  <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => void sendMessage(prompt)} disabled={isExamActive}>
                    {prompt}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask the AI tutor anything…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isExamActive) void sendMessage(prompt);
                    }
                  }}
                  disabled={isExamActive}
                />
                <Button className="gradient-primary text-primary-foreground" onClick={() => void sendMessage(prompt)} disabled={streaming || isExamActive}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4" /> Weak subjects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weakSubjects.length ? weakSubjects.map((item: any) => (
                <div key={item.subject} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.subject}</span>
                    <span className="text-muted-foreground">{item.average}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(10, Math.min(100, item.average || 0))}%` }} />
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">No weak subjects yet.</p>}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start" disabled={isExamActive}><Link to="/student/study-planner"><Zap className="mr-2 h-4 w-4" /> Open study planner</Link></Button>
              <Button asChild variant="outline" className="w-full justify-start" disabled={isExamActive}><Link to="/student/ai-quiz"><MessageSquareText className="mr-2 h-4 w-4" /> Generate quiz</Link></Button>
              <Button asChild variant="outline" className="w-full justify-start"><Link to="/student/exams"><Volume2 className="mr-2 h-4 w-4" /> Return to exams</Link></Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI rules</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              AI Tutor is disabled automatically during an active exam session to protect exam integrity.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
