import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Clock, User, ChevronDown, Loader2, Send, Lock,
  Brain, Tag, Phone, Mail, Building2, UserCheck, Flag,
  MessageSquare, FileText, History, RefreshCw, CheckCircle2,
  Calendar, AlertTriangle, Circle, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ── Types ────────────────────────────────────────────────────────────────────

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  assigned_staff: { id: string; name: string; avatar_url: string | null } | null;
};
type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

interface MessageRow {
  id: string;
  ticket_id: string;
  author_staff_id: string | null;
  direction: string;
  body: string;
  is_note: boolean;
  channel: string | null;
  created_at: string;
  author_staff: { name: string; avatar_url: string | null } | null;
}
interface HistoryRow {
  id: string;
  ticket_id: string;
  changed_by: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
  changed_by_staff: { name: string } | null;
}
interface AiClassRow {
  id: string;
  ticket_id: string;
  model: string | null;
  detected_category: string | null;
  detected_urgency: string | null;
  suggested_response: string | null;
  root_cause: string | null;
  resolution_steps: string[] | null;
  confidence_score: number | null;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  new:                   { label: "New",               color: "bg-blue-500/15 text-blue-300 border-blue-500/30",    dot: "bg-blue-400" },
  triaged:               { label: "Triaged",           color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  assigned:              { label: "Assigned",          color: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  in_progress:           { label: "In Progress",       color: "bg-amber-500/15 text-amber-300 border-amber-500/30",  dot: "bg-amber-400" },
  waiting_customer:      { label: "Waiting: Client",   color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  waiting_internal:      { label: "Waiting: Internal", color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  waiting_subcontractor: { label: "Waiting: Sub",      color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  remote_session_active: { label: "Remote Active",     color: "bg-teal-500/15 text-teal-300 border-teal-500/30",    dot: "bg-teal-400" },
  escalated:             { label: "Escalated",         color: "bg-red-500/15 text-red-300 border-red-500/30",       dot: "bg-red-400" },
  resolved:              { label: "Resolved",          color: "bg-green-500/15 text-green-300 border-green-500/30", dot: "bg-green-400" },
  reopened:              { label: "Reopened",          color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", dot: "bg-yellow-400" },
  closed:                { label: "Closed",            color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-500" },
};

const URG_CFG: Record<string, { label: string; color: string }> = {
  low:       { label: "Low",       color: "text-slate-400" },
  medium:    { label: "Medium",    color: "text-amber-400" },
  high:      { label: "High",      color: "text-orange-400" },
  emergency: { label: "Emergency", color: "text-red-400" },
};

const ALL_STATUSES = [
  "new","triaged","assigned","in_progress",
  "waiting_customer","waiting_internal","waiting_subcontractor",
  "remote_session_active","escalated","resolved","reopened","closed",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-CA", { year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit" });
}
function slaInfo(t: TicketRow): { label: string; color: string } | null {
  if (t.sla_breached) return { label: "BREACHED", color: "text-red-400 font-bold" };
  if (!t.sla_resolve_due_at) return null;
  const h = (new Date(t.sla_resolve_due_at).getTime() - Date.now()) / 3600000;
  if (h < 0) return { label: "BREACHED", color: "text-red-400 font-bold" };
  if (h < 2) return { label: `${Math.round(h * 60)}m left`, color: "text-orange-400" };
  if (h < 8) return { label: `${Math.round(h)}h left`, color: "text-amber-400" };
  return { label: `${Math.round(h)}h left`, color: "text-slate-400" };
}

// ── Small components ─────────────────────────────────────────────────────────

function Avatar({ name, url, md }: { name: string; url: string | null; md?: boolean }) {
  const sz = md ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  return url
    ? <img src={url} alt={name} className={`${sz} rounded-full object-cover ring-1 ring-slate-600`} />
    : <div className={`flex ${sz} shrink-0 items-center justify-center rounded-full bg-green-500/20 font-semibold text-green-400 ring-1 ring-green-500/30`}>{name.slice(0,2).toUpperCase()}</div>;
}

function Card({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Status changer ────────────────────────────────────────────────────────────

function StatusChanger({ ticket, onDone }: { ticket: TicketRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const change = async (s: string) => {
    setBusy(true);
    await supabase.from("tickets").update({ status: s as never }).eq("id", ticket.id);
    setBusy(false); setOpen(false); onDone();
  };

  const cfg = STATUS_CFG[ticket.status] ?? STATUS_CFG.new;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} disabled={busy}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition hover:opacity-80 ${cfg.color}`}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
        {cfg.label}<ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
          <div className="p-1 max-h-72 overflow-y-auto">
            {ALL_STATUSES.map(s => {
              const c = STATUS_CFG[s];
              return (
                <button key={s} onClick={() => change(s)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition hover:bg-slate-700 ${s === ticket.status ? "bg-slate-700/60" : ""}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c?.dot ?? "bg-slate-400"}`} />
                  <span className="text-slate-200">{c?.label ?? s}</span>
                  {s === ticket.status && <span className="ml-auto text-[10px] text-slate-500">current</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assign panel ──────────────────────────────────────────────────────────────

function AssignPanel({ ticket, staffList, onDone }: { ticket: TicketRow; staffList: StaffRow[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const assign = async (id: string | null) => {
    setBusy(true);
    await supabase.from("tickets").update({ assigned_staff_id: id, status: (id ? "assigned" : ticket.status) as never }).eq("id", ticket.id);
    setBusy(false); setOpen(false); onDone();
  };

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ticket.assigned_staff ? (
            <><Avatar name={ticket.assigned_staff.name} url={ticket.assigned_staff.avatar_url} md />
            <div><p className="text-sm font-medium text-slate-200">{ticket.assigned_staff.name}</p><p className="text-[11px] text-slate-500">Assigned</p></div></>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-700"><User size={14} /></div>
              <span className="text-sm">Unassigned</span>
            </div>
          )}
        </div>
        <button onClick={() => setOpen(!open)} disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
          {ticket.assigned_staff ? "Reassign" : "Assign"}
        </button>
      </div>
      {open && (
        <div className="absolute right-4 z-30 mt-1 w-56 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
          <div className="p-1 max-h-60 overflow-y-auto">
            <button onClick={() => assign(null)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-700">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-600"><User size={11} /></div>
              Unassign
            </button>
            {staffList.map(s => (
              <button key={s.id} onClick={() => assign(s.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                <Avatar name={s.name} url={null} />
                <div className="min-w-0"><p className="truncate font-medium">{s.name}</p><p className="text-[10px] capitalize text-slate-500">{s.role}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Message thread ────────────────────────────────────────────────────────────

function MsgThread({ msgs, myName }: { msgs: MessageRow[]; myName: string | null }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  if (!msgs.length) return (
    <div className="flex flex-col items-center py-10 text-center">
      <MessageSquare size={24} className="mb-2 text-slate-700" />
      <p className="text-xs text-slate-500">No messages yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {msgs.map(m => {
        const note = m.is_note || m.direction === "internal";
        const inbound = m.direction === "inbound";
        const author = m.author_staff?.name ?? (inbound ? "Customer" : (myName ?? "Staff"));

        if (note) return (
          <div key={m.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Lock size={11} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400">Internal Note</span>
              <span className="text-[11px] text-slate-500">· {author}</span>
              <span className="ml-auto text-[10px] text-slate-600">{timeAgo(m.created_at)}</span>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{m.body}</p>
          </div>
        );

        return (
          <div key={m.id} className={`flex gap-2.5 ${inbound ? "" : "flex-row-reverse"}`}>
            {inbound
              ? <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-slate-300">C</div>
              : m.author_staff ? <Avatar name={m.author_staff.name} url={m.author_staff.avatar_url} />
              : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-semibold text-green-400">{(myName ?? "S").slice(0,1)}</div>
            }
            <div className={`max-w-[78%] flex flex-col gap-1 ${inbound ? "" : "items-end"}`}>
              <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${inbound ? "bg-slate-800 text-slate-200 rounded-tl-sm" : "bg-green-500/15 text-green-50 rounded-tr-sm"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <div className={`flex items-center gap-1 text-[10px] text-slate-600 ${inbound ? "" : "flex-row-reverse"}`}>
                <span>{author}</span><span>·</span><span>{timeAgo(m.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── Reply composer ────────────────────────────────────────────────────────────

function Composer({
  ticketId, staffId, onSent,
  ticketData, threadMsgs, aiData,
}: {
  ticketId: string;
  staffId: string | null;
  onSent: () => void;
  ticketData?: { summary?: string | null; details?: string | null; name?: string | null };
  threadMsgs?: MessageRow[];
  aiData?: AiClassRow | null;
}) {
  const [body, setBody] = useState("");
  const [note, setNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const suggestReply = async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: ticketData?.summary,
          details: ticketData?.details,
          customerName: ticketData?.name,
          messages: (threadMsgs ?? []).slice(-10),
          aiClassification: aiData
            ? { root_cause: aiData.root_cause, resolution_steps: aiData.resolution_steps }
            : undefined,
        }),
      });
      if (res.ok) {
        const { reply } = (await res.json()) as { reply?: string };
        if (reply) setBody(reply);
      }
    } finally {
      setSuggesting(false);
    }
  };

  const send = async () => {
    if (!body.trim() || !staffId) return;
    setBusy(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: ticketId, author_staff_id: staffId,
      direction: note ? "internal" : "outbound",
      body: body.trim(), is_note: note, channel: "portal",
    } as never);
    setBody(""); setBusy(false); onSent();
  };

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <div className="mb-2 flex gap-1">
        {[{ label: "Reply", isNote: false }, { label: "Internal Note", isNote: true }].map(({ label, isNote }) => (
          <button key={label} onClick={() => setNote(isNote)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${note === isNote
              ? isNote ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25" : "bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
              : "text-slate-500 hover:text-slate-300"}`}>
            {isNote && <Lock size={10} />}{label}
          </button>
        ))}
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
        placeholder={note ? "Add an internal note…" : "Write a reply…"}
        rows={4}
        className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition ${note
          ? "border-amber-500/25 bg-amber-500/5 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/15"
          : "border-slate-700 bg-slate-800/60 focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15"}`}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-600">⌘ Enter to send</p>
          {!note && (
            <button onClick={suggestReply} disabled={suggesting || busy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-purple-400 transition hover:bg-purple-500/10 disabled:opacity-40">
              {suggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {suggesting ? "Generating…" : "Suggest Reply"}
            </button>
          )}
        </div>
        <button onClick={send} disabled={!body.trim() || !staffId || busy}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-40 ${note
            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            : "bg-green-500 text-slate-950 hover:bg-green-400"}`}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {note ? "Add Note" : "Send Reply"}
        </button>
      </div>
    </div>
  );
}

// ── History log ───────────────────────────────────────────────────────────────

function HistLog({ rows }: { rows: HistoryRow[] }) {
  if (!rows.length) return <p className="py-4 text-center text-xs text-slate-500">No history yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map(h => (
        <div key={h.id} className="flex items-start gap-2.5">
          <Circle size={5} className="mt-1.5 shrink-0 fill-slate-600 text-slate-600" />
          <div>
            <p className="text-xs text-slate-300">
              <span className="font-medium capitalize">{h.field.replace(/_/g," ")}</span>
              {h.old_value && h.new_value && <> changed <span className="text-slate-500">{h.old_value}</span> → <span className="text-slate-200">{h.new_value}</span></>}
              {h.note && <span className="text-slate-400"> — {h.note}</span>}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">{h.changed_by_staff?.name ?? "System"} · {timeAgo(h.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const navigate = useNavigate();

  const [ticket, setTicket]       = useState<TicketRow | null>(null);
  const [msgs, setMsgs]           = useState<MessageRow[]>([]);
  const [hist, setHist]           = useState<HistoryRow[]>([]);
  const [ai, setAi]               = useState<AiClassRow | null>(null);
  const [staff, setStaff]         = useState<StaffRow[]>([]);
  const [me, setMe]               = useState<StaffRow | null>(null);
  const [email, setEmail]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [missing, setMissing]     = useState(false);
  const [msgTab, setMsgTab]       = useState<"msgs" | "hist">("msgs");
  const [classifying, setClassifying] = useState(false);
  const classifyAttempted = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/tickets" }); return; }
      setEmail(data.session.user.email ?? null);
      supabase.from("staff").select("*").eq("user_id", data.session.user.id).single()
        .then(({ data: s }) => setMe(s ?? null));
    });
  }, [navigate]);

  const load = useCallback(async () => {
    const [tRes, mRes, hRes, aRes, sRes] = await Promise.all([
      supabase.from("tickets").select("*, assigned_staff:staff!tickets_assigned_staff_id_fkey(id,name,avatar_url)").eq("id", ticketId).single(),
      supabase.from("ticket_messages").select("*, author_staff:staff!ticket_messages_author_staff_id_fkey(name,avatar_url)").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("ticket_history").select("*, changed_by_staff:staff!ticket_history_changed_by_fkey(name)").eq("ticket_id", ticketId).order("created_at", { ascending: false }),
      supabase.from("ai_classifications").select("*").eq("ticket_id", ticketId).maybeSingle(),
      supabase.from("staff").select("*").eq("is_available", true).order("name"),
    ]);
    if (tRes.error || !tRes.data) { setMissing(true); setLoading(false); return; }
    setTicket(tRes.data as TicketRow);
    setMsgs((mRes.data ?? []) as MessageRow[]);
    setHist((hRes.data ?? []) as HistoryRow[]);
    setAi(aRes.data as AiClassRow | null);
    setStaff((sRes.data ?? []) as StaffRow[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const classify = useCallback(async (t: TicketRow) => {
    setClassifying(true);
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: t.id,
          summary: t.summary,
          details: t.details,
          transcript: t.transcript,
          name: t.name,
          company: t.company,
          category: t.category,
        }),
      });
      if (res.ok) {
        const d = (await res.json()) as {
          category: string; urgency: string; confidence: number;
          root_cause: string; resolution_steps: string[]; suggested_reply: string;
        };
        setAi({
          id: "", ticket_id: t.id, model: null,
          detected_category: d.category,
          detected_urgency: d.urgency,
          confidence_score: d.confidence,
          root_cause: d.root_cause,
          resolution_steps: d.resolution_steps,
          suggested_response: d.suggested_reply,
          created_at: new Date().toISOString(),
        });
      }
    } finally {
      setClassifying(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && ticket && !ai && !classifyAttempted.current) {
      classifyAttempted.current = true;
      classify(ticket);
    }
  }, [loading, ticket, ai, classify]);

  useEffect(() => {
    const ch = supabase.channel(`td-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, load]);

  const navUser = { name: me?.name, email, avatarUrl: me?.avatar_url };

  if (loading) return (
    <div className="flex h-screen bg-slate-950">
      <DashboardNav user={navUser} />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
      </div>
    </div>
  );

  if (missing || !ticket) return (
    <div className="flex h-screen bg-slate-950">
      <DashboardNav user={navUser} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <AlertTriangle size={28} className="text-slate-600" />
        <p className="text-sm text-slate-400">Ticket not found</p>
        <Link to="/tickets" className="text-xs text-green-400 hover:underline">← Back to Service Desk</Link>
      </div>
    </div>
  );

  const sla = slaInfo(ticket);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <DashboardNav user={navUser} />

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800/70 bg-slate-950/95 px-5 backdrop-blur">
          <Link to="/tickets" className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-300">
            <ArrowLeft size={14} /> Back
          </Link>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-xs font-semibold text-green-400">{ticket.reference}</span>
          {ticket.escalated && <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/30"><Flag size={9} /> Escalated</span>}
          <button onClick={load} className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"><RefreshCw size={14} /></button>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-5 py-6">

            {/* Ticket header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusChanger ticket={ticket} onDone={load} />
                  <span className={`text-xs font-medium ${(URG_CFG[ticket.urgency] ?? URG_CFG.low).color}`}>
                    {(URG_CFG[ticket.urgency] ?? URG_CFG.low).label} urgency
                  </span>
                  {sla && <span className={`flex items-center gap-1 text-xs ${sla.color}`}><Clock size={12} /> {sla.label}</span>}
                </div>
                <h1 className="text-xl font-semibold text-white">{ticket.summary ?? ticket.reference}</h1>
                {ticket.category && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Tag size={12} /> {ticket.category}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => { await supabase.from("tickets").update({ escalated: !ticket.escalated } as never).eq("id", ticket.id); load(); }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${ticket.escalated ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
                  <Flag size={12} /> {ticket.escalated ? "De-escalate" : "Escalate"}
                </button>
                {!["resolved","closed"].includes(ticket.status) && (
                  <button
                    onClick={async () => { await supabase.from("tickets").update({ status: "resolved" as never }).eq("id", ticket.id); load(); }}
                    className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-green-400">
                    <CheckCircle2 size={13} /> Resolve
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

              {/* Main (2/3) */}
              <div className="space-y-5 lg:col-span-2">

                {/* Customer */}
                <Card title="Customer" icon={<User size={14} />}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { label: "Name", value: ticket.name, plain: true },
                      { label: "Email", value: ticket.email, href: `mailto:${ticket.email}` },
                      { label: "Phone", value: ticket.phone, href: `tel:${ticket.phone}` },
                      { label: "Company", value: ticket.company, plain: true },
                      { label: "Source", value: ticket.source, plain: true },
                      { label: "Created", value: fmtDate(ticket.created_at), plain: true },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <p className="text-[10px] uppercase tracking-wide text-slate-600">{f.label}</p>
                        {f.href
                          ? <a href={f.href} className="mt-0.5 flex items-center gap-1 text-sm text-green-400 hover:underline">{f.value}</a>
                          : <p className="mt-0.5 text-sm text-slate-200">{f.value}</p>}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Details */}
                {(ticket.details || ticket.transcript) && (
                  <Card title="Issue Details" icon={<FileText size={14} />}>
                    {ticket.details && (
                      <div className="mb-4">
                        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-600">Full Description</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{ticket.details}</p>
                      </div>
                    )}
                    {ticket.transcript && (
                      <div>
                        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-600">Chat Transcript</p>
                        <pre className="max-h-52 overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-3 font-mono text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {ticket.transcript}
                        </pre>
                      </div>
                    )}
                  </Card>
                )}

                {/* Messages / History */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50">
                  <div className="flex items-center gap-1 border-b border-slate-800 px-4 py-2">
                    {[
                      { key: "msgs", label: "Messages", icon: <MessageSquare size={12} />, count: msgs.length },
                      { key: "hist", label: "History", icon: <History size={12} />, count: hist.length },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setMsgTab(tab.key as "msgs"|"hist")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${msgTab === tab.key ? "bg-green-500/15 text-green-400" : "text-slate-500 hover:text-slate-300"}`}>
                        {tab.icon} {tab.label}
                        {tab.count > 0 && <span className="rounded-full bg-slate-800 px-1.5 py-px text-[10px] text-slate-400">{tab.count}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {msgTab === "msgs"
                      ? <><MsgThread msgs={msgs} myName={me?.name ?? null} /><Composer ticketId={ticket.id} staffId={me?.id ?? null} onSent={load} ticketData={{ summary: ticket.summary, details: ticket.details, name: ticket.name }} threadMsgs={msgs} aiData={ai} /></>
                      : <HistLog rows={hist} />
                    }
                  </div>
                </div>
              </div>

              {/* Sidebar (1/3) */}
              <div className="space-y-5">

                {/* Assignment */}
                <Card title="Assignment" icon={<UserCheck size={14} />}>
                  <div className="relative">
                    <AssignPanel ticket={ticket} staffList={staff} onDone={load} />
                  </div>
                </Card>

                {/* SLA */}
                {(ticket.sla_resolve_due_at || ticket.sla_breached) && (
                  <Card title="SLA" icon={<Clock size={14} />}>
                    <div className="space-y-2.5">
                      {sla && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Status</p><p className={`mt-0.5 text-sm font-semibold ${sla.color}`}>{sla.label}</p></div>}
                      {ticket.sla_resolve_due_at && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Resolve Due</p><p className="mt-0.5 text-xs text-slate-400">{fmtDate(ticket.sla_resolve_due_at)}</p></div>}
                      {ticket.sla_response_due_at && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Response Due</p><p className="mt-0.5 text-xs text-slate-400">{fmtDate(ticket.sla_response_due_at)}</p></div>}
                      {ticket.first_response_at && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">First Response</p><p className="mt-0.5 text-xs text-slate-400">{timeAgo(ticket.first_response_at)}</p></div>}
                    </div>
                  </Card>
                )}

                {/* AI */}
                {(ai || classifying) && (
                  <Card
                    title="AI Analysis"
                    icon={<Brain size={14} />}
                    action={
                      <button
                        onClick={() => ticket && classify(ticket)}
                        disabled={classifying}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-500 transition hover:text-purple-400 disabled:opacity-40">
                        {classifying ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        {classifying ? "Analyzing…" : "Re-analyze"}
                      </button>
                    }>
                    {classifying && !ai && (
                      <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                        <Loader2 size={12} className="animate-spin text-purple-400" />
                        Analyzing ticket with AI…
                      </div>
                    )}
                    <div className="space-y-3">
                      {ai?.detected_category && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Category</p><p className="mt-0.5 text-xs text-slate-300">{ai.detected_category}</p></div>}
                      {ai?.detected_urgency && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Urgency</p><p className={`mt-0.5 text-xs font-medium ${(URG_CFG[ai.detected_urgency] ?? URG_CFG.low).color}`}>{ai.detected_urgency}</p></div>}
                      {ai?.confidence_score != null && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-600">Confidence</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                              <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${(ai.confidence_score * 100).toFixed(0)}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{(ai.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                      {ai?.root_cause && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Root Cause</p><p className="mt-0.5 text-xs text-slate-400">{ai.root_cause}</p></div>}
                      {ai?.resolution_steps && ai.resolution_steps.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-600">Suggested Steps</p>
                          <ol className="space-y-1">{ai.resolution_steps.map((s, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-400"><span className="shrink-0 font-mono text-green-500">{i+1}.</span>{s}</li>
                          ))}</ol>
                        </div>
                      )}
                      {ai?.suggested_response && (
                        <div>
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-600">Suggested Reply</p>
                          <p className="text-xs text-slate-400 leading-relaxed italic">{ai.suggested_response}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Resolution */}
                {ticket.resolved_at && (
                  <Card title="Resolution" icon={<CheckCircle2 size={14} />}>
                    <div className="space-y-2">
                      <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Resolved At</p><p className="mt-0.5 text-xs text-slate-300">{fmtDate(ticket.resolved_at)}</p></div>
                      {ticket.resolution_summary && <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Summary</p><p className="mt-0.5 text-xs text-slate-400">{ticket.resolution_summary}</p></div>}
                    </div>
                  </Card>
                )}

                {/* Timestamps */}
                <Card title="Timeline" icon={<Calendar size={14} />}>
                  <div className="space-y-2">
                    <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Created</p><p className="mt-0.5 text-xs text-slate-400">{fmtDate(ticket.created_at)}</p></div>
                    <div><p className="text-[10px] uppercase tracking-wide text-slate-600">Last Updated</p><p className="mt-0.5 text-xs text-slate-400">{timeAgo(ticket.updated_at)}</p></div>
                  </div>
                </Card>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/tickets/$ticketId")({
  component: TicketDetailPage,
});
