import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, CheckCircle2, Clock, AlertTriangle, Loader2, ChevronRight, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Ticket — LEAFVA" },
      { name: "description", content: "Check the status of your support ticket." },
    ],
  }),
  component: TrackPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

type TicketResult = {
  id: string;
  reference: string;
  status: string;
  urgency: string;
  category: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  sla_breached: boolean;
  name: string | null;
  company: string | null;
};

type Message = {
  body: string;
  direction: string;
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  new:       { label: "Received",    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",    icon: Clock },
  open:      { label: "In Progress", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  pending:   { label: "Pending",     color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: Clock },
  escalated: { label: "Escalated",   color: "text-red-400 bg-red-400/10 border-red-400/20",       icon: AlertTriangle },
  resolved:  { label: "Resolved",    color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle2 },
  closed:    { label: "Closed",      color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: CheckCircle2 },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────

function TrackPage() {
  const [ref, setRef]         = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ ticket: TicketResult; messages: Message[] } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = ref.trim().toUpperCase();
    if (!cleaned) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/ticket-track?ref=${encodeURIComponent(cleaned)}`);
      const json = await res.json() as { ticket?: TicketResult; messages?: Message[]; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "Ticket not found. Please check your reference number.");
      } else if (json.ticket) {
        setResult({ ticket: json.ticket, messages: json.messages ?? [] });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const status = result ? (STATUS_META[result.ticket.status] ?? STATUS_META.open) : null;
  const StatusIcon = status?.icon ?? Clock;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100">

      {/* Top bar */}
      <header className="border-b border-slate-800/60 bg-[#0a0c10]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/30">
              <span className="text-[10px] font-bold text-green-400">L</span>
            </div>
            <span className="text-sm font-semibold text-slate-200">LEAFVA Support</span>
          </div>
          <a href="/" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Submit a ticket <ExternalLink size={11} />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20 mb-5">
            <Search size={11} /> Ticket Tracker
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            Track Your Support Ticket
          </h1>
          <p className="mt-3 text-slate-400 text-sm max-w-sm mx-auto">
            Enter your ticket reference number to see the current status and recent updates.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="e.g. TKT-0042"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 pl-9 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-green-500/40 focus:ring-1 focus:ring-green-500/20 font-mono tracking-wider uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ref.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
            {loading ? "Searching…" : "Track"}
          </button>
        </form>

        {/* Error state */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Result */}
        {result && status && (
          <div className="mt-8 space-y-4">

            {/* Status card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Reference</p>
                  <p className="text-xl font-bold font-mono text-green-400">{result.ticket.reference}</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${status.color}`}>
                  <StatusIcon size={14} />
                  {status.label}
                </div>
              </div>

              {result.ticket.summary && (
                <div className="mt-4 pt-4 border-t border-slate-800/60">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Issue Summary</p>
                  <p className="text-sm text-slate-200">{result.ticket.summary}</p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {result.ticket.category && (
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">Category</p>
                    <p className="text-xs text-slate-300 capitalize mt-0.5">{result.ticket.category}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Priority</p>
                  <p className="text-xs text-slate-300 capitalize mt-0.5">{result.ticket.urgency}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Opened</p>
                  <p className="text-xs text-slate-300 mt-0.5">{timeAgo(result.ticket.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Last Update</p>
                  <p className="text-xs text-slate-300 mt-0.5">{timeAgo(result.ticket.updated_at)}</p>
                </div>
              </div>

              {result.ticket.sla_breached && (
                <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle size={12} />
                  This ticket has exceeded its target response time. We apologise for the delay.
                </div>
              )}
            </div>

            {/* Recent messages */}
            {result.messages.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Recent Updates</p>
                <div className="space-y-4">
                  {result.messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.direction === "outbound" ? "flex-row" : "flex-row-reverse"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                        m.direction === "outbound"
                          ? "bg-green-500/10 text-green-100 rounded-tl-none"
                          : "bg-slate-800 text-slate-200 rounded-tr-none"
                      }`}>
                        <p className={`text-[10px] mb-1 ${m.direction === "outbound" ? "text-green-400/70" : "text-slate-500"}`}>
                          {m.direction === "outbound" ? "Support Team" : "You"} · {timeAgo(m.created_at)}
                        </p>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress steps */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">Progress</p>
              <div className="flex items-center gap-0">
                {["new", "open", "resolved"].map((step, i) => {
                  const steps = ["new", "open", "pending", "escalated", "resolved", "closed"];
                  const currentIdx = steps.indexOf(result.ticket.status);
                  const stepIdx = i === 0 ? 0 : i === 1 ? 2 : 4;
                  const done = currentIdx >= stepIdx;
                  const labels = ["Received", "In Progress", "Resolved"];
                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                          done ? "border-green-500 bg-green-500/20" : "border-slate-700 bg-slate-800"
                        }`}>
                          {done ? <CheckCircle2 size={13} className="text-green-400" /> : <span className="h-2 w-2 rounded-full bg-slate-700" />}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-medium ${done ? "text-green-400" : "text-slate-600"}`}>{labels[i]}</span>
                      </div>
                      {i < 2 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${
                          currentIdx >= (i === 0 ? 2 : 4) ? "bg-green-500/40" : "bg-slate-800"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-slate-600">
          Can't find your ticket? Contact us at{" "}
          <a href="mailto:support@leafva.com" className="text-slate-500 hover:text-slate-300 transition-colors">
            support@leafva.com
          </a>
        </p>
      </main>
    </div>
  );
}
