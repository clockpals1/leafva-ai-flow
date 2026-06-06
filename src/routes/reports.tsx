import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, Loader2, Users, Ticket, RefreshCw, Zap, Shield,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — LEAFVA" }] }),
  component: ReportsPage,
});

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  assigned_staff: { id: string; name: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function fmtDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ── Chart components ───────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 bg-slate-900/60 ${accent}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-100 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <Icon size={18} className="text-slate-600 mt-0.5 shrink-0" />
      </div>
    </div>
  );
}

function HBar({
  label, count, total, color = "bg-green-500/70",
}: {
  label: string; count: number; total: number; color?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-28 text-xs text-slate-400 truncate capitalize">{label || "—"}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-300 tabular-nums w-16 text-right">
        {count} <span className="text-slate-600 text-[10px]">{pct}%</span>
      </span>
    </div>
  );
}

function VBar({
  label, count, max, color = "bg-green-500/60",
}: {
  label: string; count: number; max: number; color?: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      {count > 0 && (
        <span className="text-[10px] text-slate-400 tabular-nums">{count}</span>
      )}
      <div className="w-full bg-slate-800/60 rounded-t" style={{ height: 72 }}>
        <div
          className={`w-full rounded-t transition-all duration-700 ${color}`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-[9px] text-slate-600 w-full text-center truncate">{label}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────

function Section({
  title, children,
}: {
  title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

// ── Login gate ─────────────────────────────────────────────────────────────

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-green-400" />
          <span className="text-xs uppercase tracking-wider text-green-400">Reports</span>
        </div>
        <h1 className="text-xl font-semibold text-slate-100 mb-1">Sign in to view reports</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {err && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="Email" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500/40" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500/40" />
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null} Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

function ReportsDashboard() {
  const [tickets, setTickets]   = useState<TicketRow[]>([]);
  const [staff, setStaff]       = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [staffRow, setStaffRow]   = useState<Database["public"]["Tables"]["staff"]["Row"] | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: tickets } = await supabase
      .from("tickets")
      .select("*, assigned_staff:staff!tickets_assigned_staff_id_fkey(id, name)")
      .order("created_at", { ascending: false });
    const { data: staffList } = await supabase
      .from("staff").select("id, name, role");
    setTickets((tickets ?? []) as TicketRow[]);
    setStaff((staffList ?? []) as { id: string; name: string; role: string }[]);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      if (data.session?.user.id) {
        supabase.from("staff").select("*").eq("user_id", data.session.user.id).maybeSingle()
          .then(({ data: s }) => setStaffRow(s));
      }
    });
    load();
  }, []);

  // ── Compute stats ─────────────────────────────────────────────────────────

  const total     = tickets.length;
  const open      = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const resolved  = tickets.filter(t => ["resolved", "closed"].includes(t.status)).length;
  const breached  = tickets.filter(t => t.sla_breached).length;
  const escalated = tickets.filter(t => t.escalated).length;

  const byStatus: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const t of tickets) {
    byStatus[t.status]                     = (byStatus[t.status] ?? 0) + 1;
    byUrgency[t.urgency]                   = (byUrgency[t.urgency] ?? 0) + 1;
    const cat = t.category ?? "Uncategorised";
    byCategory[cat]                        = (byCategory[cat] ?? 0) + 1;
    const src = t.source ?? "unknown";
    bySource[src]                          = (bySource[src] ?? 0) + 1;
  }

  const days = getLast14Days();
  const dailyVolume = days.map(day => ({
    day: fmtDay(day),
    count: tickets.filter(t => t.created_at.startsWith(day)).length,
  }));
  const maxDay = Math.max(...dailyVolume.map(d => d.count), 1);

  const staffWorkload = staff.map(s => ({
    ...s,
    count: tickets.filter(t => t.assigned_staff_id === s.id && !["resolved","closed"].includes(t.status)).length,
  })).sort((a, b) => b.count - a.count);

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-500/70", open: "bg-yellow-500/70", pending: "bg-orange-500/70",
    escalated: "bg-red-500/70", resolved: "bg-green-500/70", closed: "bg-slate-500/70",
  };
  const URGENCY_COLORS: Record<string, string> = {
    low: "bg-slate-400/70", medium: "bg-yellow-400/70",
    high: "bg-orange-500/70", emergency: "bg-red-500/70",
  };
  const SOURCE_COLORS: Record<string, string> = {
    manual: "bg-green-500/70", email: "bg-blue-500/70",
    "ai-assistant": "bg-purple-500/70", form: "bg-cyan-500/70",
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <DashboardNav user={{ name: staffRow?.name, email: userEmail, avatarUrl: staffRow?.avatar_url }} />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/70 bg-slate-950/95 px-5 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <BarChart3 size={16} className="text-green-400" />
            <h1 className="text-sm font-semibold text-slate-200">Reports & Analytics</h1>
          </div>
          <button onClick={load} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
            <RefreshCw size={15} />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32 gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading analytics…</span>
          </div>
        ) : (
          <div className="p-5 space-y-5 max-w-6xl mx-auto">

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total Tickets"  value={total}     icon={Ticket}        accent="border-slate-700" />
              <StatCard label="Open"           value={open}      icon={Clock}         accent="border-yellow-500/20" sub={`${total > 0 ? Math.round((open/total)*100) : 0}% of total`} />
              <StatCard label="Resolved"       value={resolved}  icon={CheckCircle2}  accent="border-green-500/20" sub={`${total > 0 ? Math.round((resolved/total)*100) : 0}% resolved`} />
              <StatCard label="SLA Breached"   value={breached}  icon={AlertTriangle} accent="border-red-500/20"   sub={`${total > 0 ? Math.round((breached/total)*100) : 0}% breach rate`} />
              <StatCard label="Escalated"      value={escalated} icon={Zap}           accent="border-orange-500/20" />
            </div>

            {/* Daily volume */}
            <Section title="Ticket volume — last 14 days">
              <div className="flex items-end gap-1.5 h-28 mt-2">
                {dailyVolume.map(({ day, count }) => (
                  <VBar key={day} label={day} count={count} max={maxDay} />
                ))}
              </div>
            </Section>

            {/* Distribution row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Section title="By Status">
                {Object.entries(byStatus).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                  <HBar key={k} label={k} count={v} total={total} color={STATUS_COLORS[k] ?? "bg-slate-500/70"} />
                ))}
                {Object.keys(byStatus).length === 0 && <p className="text-xs text-slate-600">No data</p>}
              </Section>

              <Section title="By Urgency">
                {["emergency","high","medium","low"].filter(u => byUrgency[u] > 0).map(u => (
                  <HBar key={u} label={u} count={byUrgency[u]} total={total} color={URGENCY_COLORS[u]} />
                ))}
                {Object.keys(byUrgency).length === 0 && <p className="text-xs text-slate-600">No data</p>}
              </Section>

              <Section title="By Category">
                {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0,10).map(([k,v]) => (
                  <HBar key={k} label={k} count={v} total={total} />
                ))}
                {Object.keys(byCategory).length === 0 && <p className="text-xs text-slate-600">No data</p>}
              </Section>

              <Section title="By Source">
                {Object.entries(bySource).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                  <HBar key={k} label={k} count={v} total={total} color={SOURCE_COLORS[k] ?? "bg-slate-500/70"} />
                ))}
                {Object.keys(bySource).length === 0 && <p className="text-xs text-slate-600">No data</p>}
              </Section>
            </div>

            {/* Staff workload */}
            <Section title="Staff Workload (open tickets)">
              {staffWorkload.length === 0 ? (
                <p className="text-xs text-slate-600">No staff data</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 pb-2 text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-800">
                    <span className="flex-1">Staff Member</span>
                    <span className="w-16 text-center">Role</span>
                    <span className="w-40">Open Tickets</span>
                    <span className="w-10 text-right">Count</span>
                  </div>
                  {staffWorkload.map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-2">
                      <span className="flex-1 text-sm text-slate-200 truncate">{s.name}</span>
                      <span className="w-16 text-center">
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{s.role}</span>
                      </span>
                      <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500/60 rounded-full transition-all duration-700"
                          style={{ width: `${staffWorkload[0]?.count > 0 ? (s.count / staffWorkload[0].count) * 100 : 0}%` }} />
                      </div>
                      <span className="w-10 text-right text-sm font-mono text-slate-300">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Quick summary table */}
            <Section title="Recent Activity">
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-600">No tickets yet</p>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-600 border-b border-slate-800">
                        <th className="text-left px-5 pb-2">Reference</th>
                        <th className="text-left px-4 pb-2">Customer</th>
                        <th className="text-left px-4 pb-2">Status</th>
                        <th className="text-left px-4 pb-2">Urgency</th>
                        <th className="text-left px-4 pb-2">Source</th>
                        <th className="text-left px-4 pb-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.slice(0, 20).map(t => (
                        <tr key={t.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-2.5 font-mono text-green-400">{t.reference}</td>
                          <td className="px-4 py-2.5 text-slate-300 truncate max-w-[12rem]">{t.name ?? "—"}</td>
                          <td className="px-4 py-2.5 capitalize text-slate-400">{t.status}</td>
                          <td className="px-4 py-2.5 capitalize text-slate-400">{t.urgency}</td>
                          <td className="px-4 py-2.5 text-slate-500">{t.source ?? "—"}</td>
                          <td className="px-4 py-2.5 text-slate-600">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Route root ─────────────────────────────────────────────────────────────

function ReportsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  if (authed === null) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
    </div>;
  }
  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;
  return <ReportsDashboard />;
}
