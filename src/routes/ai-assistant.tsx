import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — LEAFVA" },
      {
        name: "description",
        content:
          "Talk to the LEAFVA AI assistant. Describe your IT need and we'll triage, ticket, and route to a specialist.",
      },
    ],
  }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Welcome to **LEAFVA**. I'm your intake specialist. Tell me what you need — IT support, AI, networking, sys-admin, an application, or a full project.",
};

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const streamChat = useCallback(async (history: Msg[]) => {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!resp.ok || !resp.body) {
      let msg = "Something went wrong. Please try again.";
      try {
        const j = await resp.json();
        if (j.error) msg = j.error;
      } catch {}
      toast.error(msg);
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const flushDelta = (delta: string) => {
      assistantText += delta;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: assistantText };
        return next;
      });
    };

    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      if (d) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          done = true;
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (delta) flushDelta(delta);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    return assistantText;
  }, []);

  const tryExtractTicket = useCallback(
    async (history: Msg[]) => {
      if (ticketRef || creating) return;
      // Quick heuristic: require an email-shaped string in the transcript
      const blob = history.map((m) => m.content).join("\n");
      const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(blob);
      if (!hasEmail || history.length < 4) return;

      setCreating(true);
      try {
        const apiKey = ""; // not needed; server reads body
        void apiKey;
        const extractResp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...history,
              {
                role: "user",
                content:
                  "SYSTEM: Output ONLY a single JSON object (no prose, no code fences) with keys: name, email, phone, company, category, urgency (low|medium|high|emergency), summary (1 line), details. Use null for unknown values.",
              },
            ],
          }),
        });
        if (!extractResp.ok || !extractResp.body) throw new Error("extract failed");
        const reader = extractResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          if (d) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) raw += delta;
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return;
        const obj = JSON.parse(match[0]) as Record<string, unknown>;
        const clean: Record<string, unknown> = {};
        for (const k of ["name", "email", "phone", "company", "category", "summary", "details"]) {
          const v = obj[k];
          if (typeof v === "string" && v.trim()) clean[k] = v.trim();
        }
        const u = obj.urgency;
        if (typeof u === "string" && ["low", "medium", "high", "emergency"].includes(u)) {
          clean.urgency = u;
        }
        if (!clean.email) return;

        clean.transcript = history;

        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clean),
        });
        if (!res.ok) throw new Error("ticket failed");
        const data = (await res.json()) as { reference: string };
        setTicketRef(data.reference);
        toast.success(`Ticket ${data.reference} created`, {
          description: "A LEAFVA specialist will follow up by email shortly.",
        });
      } catch (e) {
        console.error("ticket extraction failed", e);
      } finally {
        setCreating(false);
      }
    },
    [ticketRef, creating],
  );

  const send = async () => {
    const value = input.trim();
    if (!value || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setStreaming(true);
    try {
      const assistant = await streamChat(next);
      const finalHistory: Msg[] = [...next, { role: "assistant", content: assistant }];
      // Fire-and-forget background ticket extraction
      void tryExtractTicket(finalHistory);
    } catch {
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 1].content === ""
          ? prev.slice(0, -1)
          : prev,
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">AI Assistant</div>
      <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">
        Tell LEAFVA <span className="text-gradient-gold">what you need.</span>
      </h1>
      <p className="mt-4 text-muted-foreground">
        Live AI intake. The assistant triages your request, opens a ticket, and routes it to the
        right specialist.
      </p>

      <div className="mt-10 rounded-2xl border-hairline bg-card/60 backdrop-blur-xl overflow-hidden glow-leaf">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse-dot" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              LEAFVA Assistant · Live
            </span>
          </div>
          {ticketRef && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ticket {ticketRef}
            </span>
          )}
        </div>

        <div className="p-5 space-y-3 min-h-[420px] max-h-[60vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] text-sm px-4 py-2.5 rounded-2xl ${
                  m.role === "user"
                    ? "bg-gold text-gold-foreground rounded-br-sm"
                    : "bg-accent text-accent-foreground rounded-bl-sm border border-border/60"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&_strong]:text-gold">
                    {m.content ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                    )}
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 bg-background/40 px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            disabled={streaming}
            placeholder={streaming ? "Thinking…" : "Type your message…"}
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none px-2"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-gold-foreground disabled:opacity-40"
          >
            {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        By chatting, you agree to our{" "}
        <a href="/privacy" className="underline hover:text-gold">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="/ai-disclaimer" className="underline hover:text-gold">
          AI Disclaimer
        </a>
        . We only collect data needed to resolve your request.
      </p>
    </div>
  );
}
