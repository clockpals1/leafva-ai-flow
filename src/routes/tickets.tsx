import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, RefreshCw, LogOut, Ticket, AlertTriangle,
  Clock, CheckCircle2, ChevronDown, User, Zap, Shield,
  Wifi, Monitor, Code2, FolderOpen, PhoneCall, MoreHorizontal,
  Circle, ArrowUpDown, Bell,
} from "lucide-react";
import { createClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  assigned_staff: { id: string; name: string; avatar_url: string | null } | null;
};
type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  new:                    { label: "New",              color: "bg-blue-500/15 text-blue-300 border-blue-500/30",    dot: "bg-blue-400" },
  triaged:                { label: "Triaged",          color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  assigned:               { label: "Assigned",         color: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  in_progress:            { label: "In Progress",      color: "bg-amber-500/15 text-amber-300 border-amber-500/30",  dot: "bg-amber-400" },
  waiting_customer:       { label: "Waiting: Client",  color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  waiting_internal:       { label: "Waiting: Internal",color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  waiting_subcontractor:  { label: "Waiting: Sub",     color: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  remote_session_active:  { label: "Remote Active",    color: "bg-teal-500/15 text-teal-300 border-teal-500/30",    dot: "bg-teal-400" },
  escalated:              { label: "Escalated",        color: "bg-red-500/15 text-red-300 border-red-500/30",       dot: "bg-red-400" },
  resolved:               { label: "Resolved",         color: "bg-green-500/15 text-green-300 border-green-500/30", dot: "bg-green-400" },
  reopened:               { label: "Reopened",         color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", dot: "bg-yellow-400" },
  closed:                 { label: "Closed",           color: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-500" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low:       { label: "Low",       color: "text-slate-400" },
  medium:    { label: "Medium",    color: "text-amber-400" },
  high:      { label: "High",      color: "text-orange-400" },
  emergency: { label: "Emergency", color: "text-red-400" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "IT Support":            <Monitor size={13} />,
  "AI & Integrations":     <Zap size={13} />,
  "Networking":            <Wifi size={13} />,
  "System Administration": <Shield size={13} />,
  "Custom Applications":   <Code2 size={13} />,
  "Full IT Project":       <FolderOpen size={13} />,
  "Emergency / Outage":    <AlertTriangle size={13} />,
};

const TABS = [
  { key: "all",        label: "All" },
  { key: "new",        label: "New" },
  { key: "active",     label: "In Progress" },
  { key: "waiting",    label: "Waiting" },
  { key: "escalated",  label: "Escalated" },
  { key: "resolved",   label: "Resolved" },
  { key: "closed",     label: "Closed" },
  { key: "mine",       label: "Assigned to Me" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function slaStatus(ticket: TicketRow): { label: string; color: string } | null {
  if (ticket.sla_breached) return { label: "BREACHED", color: "text-red-400 font-semibold" };
  if (!ticket.sla_resolve_due_at) return null;
  const remaining = new Date(ticket.sla_resolve_due_at).getTime() - Date.now();
  const hours = remaining / 3600000;
  if (hours < 0) return { label: "BREACHED", color: "text-red-400 font-semibold" };
  if (hours < 2) return { label: `${Math.round(hours * 60)}m left`, color: "text-orange-400" };
  if (hours < 8) return { label: `${Math.round(hours)}h left`, color: "text-amber-400" };
  return { label: `${Math.round(hours)}h left`, color: "text-slate-400" };
}

function tabFilter(ticket: TicketRow, tab: string, myStaffId: string | null): boolean {
  const s = ticket.status;
  if (tab === "all") return true;
  if (tab === "new") return s === "new" || s === "triaged";
  if (tab === "active") return ["assigned", "in_progress", "remote_session_active"].includes(s);
  if (tab === "waiting") return s.startsWith("waiting_");
  if (tab === "escalated") return s === "escalated" || ticket.escalated;
  if (tab === "resolved") return s === "resolved" || s === "reopened";
  if (tab === "closed") return s === "closed";
  if (tab === "mine") return !!myStaffId && ticket.assigned_staff_id === myStaffId;
  return true;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-700 text-slate-300 border-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = URGENCY_CONFIG[urgency] ?? { label: urgency, color: "text-slate-400" };
  return <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 animate-pulse rounded bg-slate-800" style={{ width: `${40 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/60">
            <Ticket size={24} className="text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-300">No tickets here</p>
          <p className="mt-1 text-xs text-slate-500">
            {tab === "mine" ? "No tickets are currently assigned to you." : "No tickets match this filter."}
          </p>
        </div>
      </td>
    </tr>
  );
}

function StaffAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-600" />;
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-[10px] font-semibold text-green-400 ring-1 ring-green-500/30">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Auth Gate ────────────────────────────────────────────────────────────────

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-green-500/30">
            <Ticket size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest text-green-400 uppercase">LEAFVA</p>
            <h1 className="text-lg font-semibold text-white">Service Desk</h1>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h2 className="mb-5 text-base font-semibold text-white">Sign in to continue</h2>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
          )}
          <div className="space-y-3">
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30"
            />
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="mt-4 w-full rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function TicketsDashboard() {
  const navigate = useNavigate();
  const supabase = createClient();

  const [authed, setAuthed]         = useState<boolean | null>(null);
  const [staff, setStaff]           = useState<StaffRow | null>(null);
  const [tickets, setTickets]       = useState<TicketRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("all");
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("all");
  const [urgFilter, setUrgFilter]   = useState("all");
  const [sortField, setSortField]   = useState<"created_at" | "urgency" | "status">("created_at");

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthed(!!session);
      if (!session) setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Staff record ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("staff").select("*").eq("user_id", data.user.id).single().then(({ data: s }) => {
        setStaff(s ?? null);
      });
    });
  }, [authed]);

  // ── Fetch tickets ────────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, assigned_staff:staff!tickets_assigned_staff_id_fkey(id, name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setTickets(data as TicketRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchTickets(); }, [authed, fetchTickets]);

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel("tickets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, fetchTickets]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    if (!tabFilter(t, activeTab, staff?.id ?? null)) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (urgFilter !== "all" && t.urgency !== urgFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [t.reference, t.name, t.email, t.company, t.summary, t.category].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortField === "urgency") {
      const order = { emergency: 0, high: 1, medium: 2, low: 3 };
      return (order[a.urgency as keyof typeof order] ?? 9) - (order[b.urgency as keyof typeof order] ?? 9);
    }
    if (sortField === "status") return a.status.localeCompare(b.status);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const tabCounts = TABS.reduce((acc, t) => {
    acc[t.key] = tickets.filter(tk => tabFilter(tk, t.key, staff?.id ?? null)).length;
    return acc;
  }, {} as Record<string, number>);

  const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))] as string[];

  const stats = {
    open:     tickets.filter(t => !["resolved", "closed"].includes(t.status)).length,
    breached: tickets.filter(t => t.sla_breached).length,
    escalated:tickets.filter(t => t.escalated).length,
    new:      tickets.filter(t => t.status === "new").length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (authed === null) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-400 border-t-transparent" /></div>;
  }
  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">

      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800/70 bg-slate-950/95 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/30">
            <Ticket size={16} className="text-green-400" />
          </div>
          <span className="text-[11px] font-semibold tracking-widest text-green-400 uppercase">LEAFVA</span>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-medium text-slate-200">Service Desk</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTickets} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300">
            <Bell size={15} />
          </button>
          {staff && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5">
              <StaffAvatar name={staff.name} avatarUrl={staff.avatar_url} />
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-200 leading-tight">{staff.name}</p>
                <p className="text-[10px] capitalize text-slate-500">{staff.role}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-red-400" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-800/60 bg-slate-900/40 px-5 py-3 sm:grid-cols-4">
        {[
          { label: "Open Tickets", value: stats.open, icon: <Circle size={14} />, color: "text-blue-400" },
          { label: "SLA Breached", value: stats.breached, icon: <AlertTriangle size={14} />, color: "text-red-400" },
          { label: "Escalated", value: stats.escalated, icon: <PhoneCall size={14} />, color: "text-orange-400" },
          { label: "New Today", value: stats.new, icon: <Zap size={14} />, color: "text-green-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-lg font-bold leading-tight text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Tabs + Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-800/60 bg-slate-950 px-5 pb-3 pt-3">
          {/* Tab row */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  activeTab === tab.key ? "bg-green-500/25 text-green-300" : "bg-slate-800 text-slate-500"
                }`}>
                  {tabCounts[tab.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + filter row */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets, customers, references…"
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
              />
            </div>
            <div className="relative">
              <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-700/60 bg-slate-900 py-2 pl-8 pr-7 text-xs text-slate-300 outline-none focus:border-green-500/50">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative">
              <select value={urgFilter} onChange={e => setUrgFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-700/60 bg-slate-900 py-2 pl-3 pr-7 text-xs text-slate-300 outline-none focus:border-green-500/50">
                <option value="all">All Urgency</option>
                <option value="emergency">Emergency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative">
              <ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortField} onChange={e => setSortField(e.target.value as typeof sortField)}
                className="appearance-none rounded-lg border border-slate-700/60 bg-slate-900 py-2 pl-8 pr-7 text-xs text-slate-300 outline-none focus:border-green-500/50">
                <option value="created_at">Newest first</option>
                <option value="urgency">By urgency</option>
                <option value="status">By status</option>
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Table — desktop */}
        <div className="hidden flex-1 overflow-auto sm:block">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
              <tr>
                {["Reference", "Customer", "Category", "Urgency", "Status", "Assigned", "SLA", "Created"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                filtered.map(ticket => {
                  const sla = slaStatus(ticket);
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate({ to: `/tickets/${ticket.id}` })}
                      className="group cursor-pointer border-b border-slate-800/60 transition hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {ticket.escalated && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
                          <span className="font-mono font-semibold text-green-400">{ticket.reference}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-200">{ticket.name ?? "—"}</p>
                        {ticket.company && <p className="text-[11px] text-slate-500">{ticket.company}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {ticket.category ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            <span className="text-slate-500">{CATEGORY_ICONS[ticket.category]}</span>
                            {ticket.category}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <UrgencyBadge urgency={ticket.urgency} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {ticket.assigned_staff ? (
                          <div className="flex items-center gap-2">
                            <StaffAvatar name={ticket.assigned_staff.name} avatarUrl={ticket.assigned_staff.avatar_url} />
                            <span className="text-slate-300">{ticket.assigned_staff.name}</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <User size={13} /> Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {sla ? (
                          <span className={`flex items-center gap-1.5 ${sla.color}`}>
                            <Clock size={12} /> {sla.label}
                          </span>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{timeAgo(ticket.created_at)}</td>
                      <td className="px-4 py-3.5 opacity-0 group-hover:opacity-100">
                        <button className="rounded-md p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300">
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards — mobile */}
        <div className="flex-1 overflow-auto p-4 sm:hidden">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-900" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Ticket size={28} className="mb-3 text-slate-600" />
              <p className="text-sm text-slate-400">No tickets found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(ticket => {
                const sla = slaStatus(ticket);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => navigate({ to: `/tickets/${ticket.id}` })}
                    className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 active:bg-slate-800"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-green-400">{ticket.reference}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="text-sm font-medium text-slate-200">{ticket.name ?? "Unknown"}</p>
                    {ticket.company && <p className="text-xs text-slate-500">{ticket.company}</p>}
                    {ticket.summary && <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{ticket.summary}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <UrgencyBadge urgency={ticket.urgency} />
                      {ticket.category && <span className="text-[11px] text-slate-500">{ticket.category}</span>}
                      {sla && <span className={`text-[11px] ${sla.color}`}>{sla.label}</span>}
                      <span className="ml-auto text-[11px] text-slate-600">{timeAgo(ticket.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="flex items-center justify-between border-t border-slate-800/60 bg-slate-950 px-5 py-2">
            <p className="text-[11px] text-slate-600">
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""} shown
              {search && ` · "${search}"`}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <CheckCircle2 size={11} className="text-green-500" />
              Live updates enabled
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/tickets")({
  component: TicketsDashboard,
});
