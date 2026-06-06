import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, Shield, Wrench, Users, Crown, UserX,
  Pencil, Check, X, Loader2, Mail, Phone, ToggleLeft, ToggleRight,
  ChevronDown, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];
type StaffRole = Database["public"]["Enums"]["staff_role"];

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES: StaffRole[] = ["admin", "manager", "technician", "subcontractor"];

const ROLE_CFG: Record<StaffRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin:         { label: "Admin",         color: "bg-red-500/15 text-red-300 border-red-500/30",       icon: <Shield size={11} /> },
  manager:       { label: "Manager",       color: "bg-purple-500/15 text-purple-300 border-purple-500/30", icon: <Crown size={11} /> },
  technician:    { label: "Technician",    color: "bg-blue-500/15 text-blue-300 border-blue-500/30",    icon: <Wrench size={11} /> },
  subcontractor: { label: "Subcontractor", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: <Users size={11} /> },
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ name, url, lg }: { name: string; url: string | null; lg?: boolean }) {
  const sz = lg ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return url
    ? <img src={url} alt={name} className={`${sz} rounded-full object-cover ring-1 ring-slate-700`} />
    : <div className={`flex ${sz} shrink-0 items-center justify-center rounded-full bg-green-500/15 font-semibold text-green-400 ring-1 ring-green-500/25`}>{name.slice(0, 2).toUpperCase()}</div>;
}

function RoleBadge({ role }: { role: StaffRole }) {
  const cfg = ROLE_CFG[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ── Role dropdown ─────────────────────────────────────────────────────────────

function RoleDropdown({ current, onChange, disabled }: { current: StaffRole; onChange: (r: StaffRole) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => !disabled && setOpen(!open)} disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 disabled:opacity-40">
        {ROLE_CFG[current].label}<ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
          <div className="p-1">
            {ALL_ROLES.map(r => (
              <button key={r} onClick={() => { onChange(r); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition hover:bg-slate-700 ${r === current ? "bg-slate-700/60" : ""}`}>
                <span className="text-slate-400">{ROLE_CFG[r].icon}</span>
                <span className="text-slate-200">{ROLE_CFG[r].label}</span>
                {r === current && <Check size={10} className="ml-auto text-green-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create staff modal ────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [role, setRole]       = useState<StaffRole>("technician");
  const [skills, setSkills]   = useState("");
  const [maxT, setMaxT]       = useState("10");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setErr("Name and email are required."); return; }
    setBusy(true); setErr("");
    const skillArr = skills.split(",").map(s => s.trim()).filter(Boolean);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? "";
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role,
        skills: skillArr,
        max_tickets: parseInt(maxT) || 10,
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr((j as { error?: string }).error ?? "Failed to invite staff member"); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-100">Invite Staff Member</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}
          <p className="rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-2 text-xs text-slate-400">
            An invitation email will be sent to the staff member with a link to set their password.
          </p>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Email *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jane@leafva.ca"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 416 000 0000"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Max Tickets</label>
              <input value={maxT} onChange={e => setMaxT(e.target.value)} type="number" min="1" max="100"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Role</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${r === role ? ROLE_CFG[r].color : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300"}`}>
                  {ROLE_CFG[r].icon}{ROLE_CFG[r].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-slate-500">Skills (comma-separated)</label>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="networking, windows, linux"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/15" />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-300">Cancel</button>
          <button onClick={submit} disabled={busy || !name.trim() || !email.trim()}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-green-400 disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff card ────────────────────────────────────────────────────────────────

function StaffCard({ member, canEdit, onUpdated }: { member: StaffRow; canEdit: boolean; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [maxT, setMaxT]       = useState(String(member.max_tickets));
  const [skillsStr, setSkillsStr] = useState(member.skills.join(", "));

  const toggle = async () => {
    setBusy(true);
    await supabase.from("staff").update({ is_available: !member.is_available } as never).eq("id", member.id);
    setBusy(false); onUpdated();
  };

  const changeRole = async (role: StaffRole) => {
    await supabase.from("staff").update({ role } as never).eq("id", member.id);
    onUpdated();
  };

  const saveEdit = async () => {
    setBusy(true);
    const skillArr = skillsStr.split(",").map(s => s.trim()).filter(Boolean);
    await supabase.from("staff").update({ max_tickets: parseInt(maxT) || 10, skills: skillArr } as never).eq("id", member.id);
    setBusy(false); setEditing(false); onUpdated();
  };

  return (
    <div className={`rounded-xl border bg-slate-900/50 p-5 transition ${member.is_available ? "border-slate-800" : "border-slate-800/40 opacity-60"}`}>
      <div className="flex items-start gap-4">
        <Avatar name={member.name} url={member.avatar_url} lg />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-100 truncate">{member.name}</p>
            <RoleBadge role={member.role} />
            {!member.is_available && (
              <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-500">Unavailable</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Mail size={10} />{member.email}</span>
            {member.phone && <span className="flex items-center gap-1"><Phone size={10} />{member.phone}</span>}
          </div>
          {member.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member.skills.map(s => (
                <span key={s} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{s}</span>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggle} disabled={busy} title={member.is_available ? "Mark unavailable" : "Mark available"}
              className="text-slate-500 transition hover:text-green-400 disabled:opacity-40">
              {member.is_available
                ? <ToggleRight size={22} className="text-green-400" />
                : <ToggleLeft size={22} />}
            </button>
            <button onClick={() => setEditing(!editing)} title="Edit"
              className={`rounded-lg p-1.5 transition ${editing ? "bg-slate-700 text-slate-200" : "text-slate-600 hover:bg-slate-800 hover:text-slate-300"}`}>
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800/60 pt-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Role:</span>
            <RoleDropdown current={member.role} onChange={changeRole} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 ml-auto">
            <span>Max tickets:</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{member.max_tickets}</span>
          </div>
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-600">Max Tickets</label>
              <input value={maxT} onChange={e => setMaxT(e.target.value)} type="number" min="1" max="100"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-green-500/40" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-600">Skills (comma-sep)</label>
              <input value={skillsStr} onChange={e => setSkillsStr(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-green-500/40" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300"><X size={12} /> Cancel</button>
            <button onClick={saveEdit} disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 disabled:opacity-40">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function StaffPage() {
  const navigate = useNavigate();
  const [staff, setStaff]     = useState<StaffRow[]>([]);
  const [me, setMe]           = useState<StaffRow | null>(null);
  const [email, setEmail]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/tickets" }); return; }
      setEmail(data.session.user.email ?? null);
      supabase.from("staff").select("*").eq("user_id", data.session.user.id).single()
        .then(({ data: s }) => setMe(s ?? null));
    });
  }, [navigate]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("staff").select("*").order("name");
    setStaff((data ?? []) as StaffRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const canEdit = me?.role === "admin" || me?.role === "manager";
  const navUser = { name: me?.name, email, avatarUrl: me?.avatar_url };

  const filtered = staff.filter(s => {
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.skills.some(sk => sk.toLowerCase().includes(q));
    return matchRole && matchSearch;
  });

  const counts = {
    all: staff.length,
    available: staff.filter(s => s.is_available).length,
  };

  if (loading) return (
    <div className="flex h-screen bg-slate-950">
      <DashboardNav user={navUser} />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <DashboardNav user={navUser} />

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-800/70 bg-slate-950/95 px-5 backdrop-blur">
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Staff</h1>
            <p className="text-[11px] text-slate-500">{counts.available} available · {counts.all} total</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {canEdit && (
              <button onClick={() => setCreating(true)}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-green-400">
                <Plus size={14} /> Add Member
              </button>
            )}
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/50 px-5 py-3">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, skill…"
              className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 py-2 pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-green-500/40 focus:ring-1 focus:ring-green-500/10" />
          </div>
          <div className="flex gap-1.5">
            {([["all", "All"] as const, ...ALL_ROLES.map(r => [r, ROLE_CFG[r].label] as const)]).map(([val, label]) => (
              <button key={val} onClick={() => setRoleFilter(val as StaffRole | "all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${roleFilter === val ? "bg-green-500/15 text-green-400" : "text-slate-500 hover:text-slate-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <AlertTriangle size={28} className="text-slate-700" />
              <p className="text-sm text-slate-500">{staff.length === 0 ? "No staff members yet." : "No results for your search."}</p>
              {canEdit && staff.length === 0 && (
                <button onClick={() => setCreating(true)}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-green-500/15 px-4 py-2 text-xs font-medium text-green-400 hover:bg-green-500/25">
                  <Plus size={13} /> Add first member
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {filtered.map(member => (
                <StaffCard key={member.id} member={member} canEdit={canEdit} onUpdated={load} />
              ))}
            </div>
          )}
        </main>
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

// ── Route ──────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/staff")({
  component: StaffPage,
});
