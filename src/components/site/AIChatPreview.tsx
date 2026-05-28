import { useEffect, useState } from "react";

const script = [
  { from: "bot", text: "Welcome to LEAFVA. Tell me what you need." },
  { from: "user", text: "Our office network is dropping every hour." },
  { from: "bot", text: "Got it. Urgency — low, medium, high, or emergency?" },
  { from: "user", text: "High. Twelve users affected." },
  { from: "bot", text: "Routing to a Networking specialist. I'll open a ticket and email confirmation now." },
];

export function AIChatPreview() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown((s) => (s >= script.length ? 1 : s + 1)), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-2xl border-hairline bg-card/60 backdrop-blur-xl p-5 glow-leaf overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-beam-sweep" />
      <div className="flex items-center gap-2 pb-4 border-b border-border/60">
        <span className="h-2 w-2 rounded-full bg-gold animate-pulse-dot" />
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">LEAFVA Assistant · Live</span>
      </div>
      <div className="mt-4 space-y-3 min-h-[260px]">
        {script.slice(0, shown).map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] text-sm px-4 py-2.5 rounded-2xl ${
                m.from === "user"
                  ? "bg-gold text-gold-foreground rounded-br-sm"
                  : "bg-accent text-accent-foreground rounded-bl-sm border border-border/60"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
        <input
          disabled
          placeholder="Describe your issue or project…"
          className="bg-transparent flex-1 text-sm placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button className="text-xs font-medium text-gold/80">↵</button>
      </div>
    </div>
  );
}
