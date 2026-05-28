import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — LEAFVA" },
      { name: "description", content: "Talk to the LEAFVA AI assistant. Describe your IT need and we'll triage, ticket, and route to a specialist." },
    ],
  }),
  component: Assistant,
});

type Msg = { role: "bot" | "user"; text: string };

const flow: { ask: string; key: string }[] = [
  { ask: "Welcome to LEAFVA. What category best fits your need — IT support, AI, networking, applications, or a project?", key: "category" },
  { ask: "Got it. How urgent is this — low, medium, high, or emergency?", key: "urgency" },
  { ask: "Briefly describe the system, device, or project goal.", key: "details" },
  { ask: "What's your name?", key: "name" },
  { ask: "Best email to reach you?", key: "email" },
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: flow[0].ask }]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const value = input.trim();
    if (!value || done) return;
    const next = [...messages, { role: "user" as const, text: value }];
    setInput("");
    const nextStep = step + 1;
    if (nextStep < flow.length) {
      setMessages([...next, { role: "bot", text: flow[nextStep].ask }]);
      setStep(nextStep);
    } else {
      setMessages([
        ...next,
        { role: "bot", text: "Thank you. I've drafted your ticket and will route it to the right specialist. You'll receive a confirmation email shortly." },
      ]);
      setDone(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">AI Assistant</div>
      <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">
        Tell LEAFVA <span className="text-gradient-gold">what you need.</span>
      </h1>
      <p className="mt-4 text-muted-foreground">
        This is a guided intake preview. Live AI routing and email confirmations activate
        once the backend is connected.
      </p>

      <div className="mt-10 rounded-2xl border-hairline bg-card/60 backdrop-blur-xl overflow-hidden glow-leaf">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse-dot" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LEAFVA Assistant · Online</span>
        </div>
        <div className="p-5 space-y-3 min-h-[420px] max-h-[60vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] text-sm px-4 py-2.5 rounded-2xl ${
                m.role === "user"
                  ? "bg-gold text-gold-foreground rounded-br-sm"
                  : "bg-accent text-accent-foreground rounded-bl-sm border border-border/60"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 bg-background/40 px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={done}
            placeholder={done ? "Conversation complete" : "Type your message…"}
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none px-2"
          />
          <button
            onClick={send}
            disabled={done || !input.trim()}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-gold-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        By chatting, you agree to our <a href="/privacy" className="underline hover:text-gold">Privacy Policy</a> and{" "}
        <a href="/ai-disclaimer" className="underline hover:text-gold">AI Disclaimer</a>. We only collect data needed to resolve your request.
      </p>
    </div>
  );
}
