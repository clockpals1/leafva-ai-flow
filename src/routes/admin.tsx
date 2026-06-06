import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Loader2, Save, Eye, EyeOff, Settings, Bot, Mail, Bell, ShieldCheck, Server, Tag, Clock, Palette, Plus, Trash2, Edit, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LEAFVA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type AppSetting = {
  key: string;
  value: string | null;
  is_secret: boolean;
  category: string;
  label: string;
  description: string | null;
};

type Tab = "ai" | "email" | "smtp" | "notifications" | "categories" | "sla" | "branding";

const TAB_META: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "ai",            label: "AI",            icon: Bot },
  { id: "email",         label: "Email",         icon: Mail },
  { id: "smtp",          label: "SMTP",          icon: Server },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "categories",    label: "Categories",    icon: Tag },
  { id: "sla",           label: "SLA Policies",  icon: Clock },
  { id: "branding",      label: "Branding",      icon: Palette },
];

const BOOLEAN_KEYS = new Set([
  "notify_new_ticket", "notify_ticket_update", "notify_status_change",
  "notify_assignment", "smtp_secure", "ai_classify_auto",
]);

const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  email_provider: [
    { value: "resend", label: "Resend (recommended)" },
    { value: "smtp",   label: "SMTP" },
  ],
};

// ---------- Login form ----------

function LoginForm({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) onLogin(data.session);
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <div className="flex items-center gap-2 mb-8">
        <ShieldCheck className="h-5 w-5 text-gold" />
        <span className="text-xs uppercase tracking-[0.25em] text-gold">Admin Access</span>
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in to LEAFVA Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage AI settings, email configuration and notifications.</p>

      <form onSubmit={handleLogin} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            placeholder="admin@leafva.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}

// ---------- Individual setting row ----------

function SettingRow({
  setting,
  onSave,
}: {
  setting: AppSetting;
  onSave: (key: string, value: string, token: string) => Promise<void>;
}) {
  // Secrets: start empty so user just types new value; plain fields: start from saved value
  const [draft, setDraft] = useState(setting.is_secret ? "" : (setting.value ?? ""));
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  // Secrets are dirty when any non-empty value is entered; plain fields when changed
  const dirty = setting.is_secret ? draft.trim() !== "" : draft !== (setting.value ?? "");

  const handleChange = (v: string) => { setDraft(v); };

  const handleSave = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    setSaving(true);
    try {
      await onSave(setting.key, draft, token);
      if (setting.is_secret) setDraft(""); // clear after saving so dirty resets
    } finally {
      setSaving(false);
    }
  };

  const isBoolean = BOOLEAN_KEYS.has(setting.key);
  const selectOpts = SELECT_OPTIONS[setting.key];
  const isTextarea = setting.key === "ai_system_prompt";
  const isConfigured = setting.is_secret && setting.value === "••••••••";
  const inputCls =
    "flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold font-mono";

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">{setting.label}</label>
          <div className="flex items-center gap-2">
            {setting.is_secret && (
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isConfigured ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
              }`}>
                {isConfigured ? "● Configured" : "○ Not set"}
              </span>
            )}
            {dirty && (
              <span className="text-[10px] uppercase tracking-wider bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">
                unsaved
              </span>
            )}
          </div>
        </div>
        {setting.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        {isBoolean ? (
          <div className="flex flex-1 items-center gap-3 py-1">
            <button
              type="button"
              role="switch"
              aria-checked={draft === "true"}
              onClick={() => handleChange(draft === "true" ? "false" : "true")}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                draft === "true" ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                draft === "true" ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
            <span className={`text-sm ${draft === "true" ? "text-green-400" : "text-slate-400"}`}>
              {draft === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
        ) : selectOpts ? (
          <select
            value={draft}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {selectOpts.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            rows={5}
            value={draft}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange(e.target.value)}
            className={`${inputCls} resize-y`}
            placeholder="(uses built-in default when blank)"
          />
        ) : (
          <input
            type={setting.is_secret && !show ? "password" : "text"}
            value={draft}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
            className={inputCls}
            placeholder={setting.is_secret ? (isConfigured ? "Enter new value to change…" : "(not configured)") : "(not set)"}
          />
        )}
        {setting.is_secret && !isTextarea && !isBoolean && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="mt-0.5 p-2 rounded-lg border border-border hover:bg-accent transition-colors"
            title={show ? "Hide" : "Show"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground disabled:opacity-40 transition-opacity"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}

// ---------- Entity panels (Categories, SLA, Branding) ----------

function CategoriesPanel({ session }: { session: Session }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", color: "#22c55e", default_urgency: "medium", default_sla_hours: 24, auto_assign_skill: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/entity?type=categories", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [session.access_token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const action = editing ? "update" : "create";
    const body = { type: "categories", action, data: editing ? { ...form, id: editing.id } : form };
    const res = await fetch("/api/admin/entity", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setEditing(null); setForm({ name: "", color: "#22c55e", default_urgency: "medium", default_sla_hours: 24, auto_assign_skill: "" }); load(); toast.success(action === "create" ? "Category created" : "Category updated"); }
    else toast.error("Failed to save");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch("/api/admin/entity", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type: "categories", action: "delete", data: { id } }),
    });
    if (res.ok) { load(); toast.success("Deleted"); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket Categories</h2>
        <button onClick={() => { setEditing(null); setForm({ name: "", color: "#22c55e", default_urgency: "medium", default_sla_hours: 24, auto_assign_skill: "" }); }} className="flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground">
          <Plus size={14} /> Add Category
        </button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4">
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">Default: {item.default_urgency} · SLA: {item.default_sla_hours}h</p>
              </div>
              <button onClick={() => { setEditing(item); setForm({ name: item.name, color: item.color, default_urgency: item.default_urgency, default_sla_hours: item.default_sla_hours, auto_assign_skill: item.auto_assign_skill ?? "" }); }} className="p-2 rounded-lg hover:bg-accent"><Edit size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-accent text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {(editing || (!editing && form.name)) && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <div className="flex gap-3">
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10 w-16 rounded-lg border border-border bg-card" />
            <select value={form.default_urgency} onChange={e => setForm({ ...form, default_urgency: e.target.value })} className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
            <input type="number" value={form.default_sla_hours} onChange={e => setForm({ ...form, default_sla_hours: parseInt(e.target.value) })} placeholder="SLA hours" className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <input value={form.auto_assign_skill} onChange={e => setForm({ ...form, auto_assign_skill: e.target.value })} placeholder="Auto-assign skill (e.g., networking)" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground">Save</button>
            <button onClick={() => { setEditing(null); setForm({ name: "", color: "#22c55e", default_urgency: "medium", default_sla_hours: 24, auto_assign_skill: "" }); }} className="rounded-lg px-3 py-2 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SLAPanel({ session }: { session: Session }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", urgency: "", response_hours: 4, resolution_hours: 24, escalation_hours: 12, is_default: false });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/entity?type=sla", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [session.access_token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const action = editing ? "update" : "create";
    const body = { type: "sla", action, data: editing ? { ...form, id: editing.id } : form };
    const res = await fetch("/api/admin/entity", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setEditing(null); setForm({ name: "", urgency: "", response_hours: 4, resolution_hours: 24, escalation_hours: 12, is_default: false }); load(); toast.success(action === "create" ? "SLA created" : "SLA updated"); }
    else toast.error("Failed to save");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SLA policy?")) return;
    const res = await fetch("/api/admin/entity", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type: "sla", action: "delete", data: { id } }),
    });
    if (res.ok) { load(); toast.success("Deleted"); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">SLA Policies</h2>
        <button onClick={() => { setEditing(null); setForm({ name: "", urgency: "", response_hours: 4, resolution_hours: 24, escalation_hours: 12, is_default: false }); }} className="flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground">
          <Plus size={14} /> Add SLA
        </button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4">
              <Clock className="h-8 w-8 text-gold" />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name} {item.is_default && <span className="ml-2 text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full">Default</span>}</p>
                <p className="text-xs text-muted-foreground">Response: {item.response_hours}h · Resolution: {item.resolution_hours}h · Escalation: {item.escalation_hours}h</p>
              </div>
              <button onClick={() => { setEditing(item); setForm({ name: item.name, urgency: item.urgency ?? "", response_hours: item.response_hours, resolution_hours: item.resolution_hours, escalation_hours: item.escalation_hours, is_default: item.is_default }); }} className="p-2 rounded-lg hover:bg-accent"><Edit size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-accent text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {(editing || (!editing && form.name)) && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Policy name" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="">All urgencies</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.response_hours} onChange={e => setForm({ ...form, response_hours: parseInt(e.target.value) })} placeholder="Response (h)" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            <input type="number" value={form.resolution_hours} onChange={e => setForm({ ...form, resolution_hours: parseInt(e.target.value) })} placeholder="Resolution (h)" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            <input type="number" value={form.escalation_hours} onChange={e => setForm({ ...form, escalation_hours: parseInt(e.target.value) })} placeholder="Escalation (h)" className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-border" />
            Set as default policy
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground">Save</button>
            <button onClick={() => { setEditing(null); setForm({ name: "", urgency: "", response_hours: 4, resolution_hours: 24, escalation_hours: 12, is_default: false }); }} className="rounded-lg px-3 py-2 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandingPanel({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ company_name: "", primary_color: "#22c55e", logo_url: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) {
      const json = await res.json() as { settings: AppSetting[] };
      const map = new Map(json.settings.map((s: AppSetting) => [s.key, s.value]));
      setForm({
        company_name: map.get("branding_company_name") ?? "",
        primary_color: map.get("branding_primary_color") ?? "#22c55e",
        logo_url: map.get("branding_logo_url") ?? "",
      });
    }
    setLoading(false);
  }, [session.access_token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string, value: string) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) toast.success("Saved");
    else toast.error("Failed to save");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Business Branding</h2>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Company Name</label>
            <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} onBlur={() => handleSave("branding_company_name", form.company_name)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Your Company Inc." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Primary Color</label>
            <div className="flex gap-3">
              <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} onBlur={() => handleSave("branding_primary_color", form.primary_color)} className="h-10 w-16 rounded-lg border border-border bg-card" />
              <input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} onBlur={() => handleSave("branding_primary_color", form.primary_color)} className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Logo URL</label>
            <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} onBlur={() => handleSave("branding_logo_url", form.logo_url)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="https://example.com/logo.png" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Settings panel ----------

function SettingsPanel({ session }: { session: Session }) {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("ai");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json() as { settings: AppSetting[] };
      const rows = json.settings;
      setSettings(rows ?? []);
    } catch (e) {
      toast.error("Could not load settings");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (key: string, value: string, token: string) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error((j as { error?: string }).error ?? "Save failed");
      throw new Error("save failed");
    }
    toast.success(`"${key}" saved`);
    setSettings((prev: AppSetting[]) =>
      prev.map((s: AppSetting) =>
        s.key === key
          ? { ...s, value: s.is_secret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : value }
          : s,
      ),
    );
  };

  const tabSettings = settings.filter((s) => s.category === activeTab);

  return (
    <div className="flex h-screen bg-slate-950">
      <DashboardNav user={{ email: session.user.email }} />
      <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Settings className="h-4 w-4 text-gold" />
        <span className="text-xs uppercase tracking-[0.25em] text-gold">Settings</span>
      </div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{session.user.email}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/60 border border-border/60 mb-8 w-fit">
        {TAB_META.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === id
                ? "bg-gold text-gold-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "categories" ? (
        <CategoriesPanel session={session} />
      ) : activeTab === "sla" ? (
        <SLAPanel session={session} />
      ) : activeTab === "branding" ? (
        <BrandingPanel session={session} />
      ) : loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading settings…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {tabSettings.length === 0 && (
            <p className="text-sm text-muted-foreground py-8">No settings in this category.</p>
          )}
          {tabSettings.map((s) => (
            <SettingRow key={s.key} setting={s} onSave={handleSave} />
          ))}
        </div>
      )}

      {/* Note */}
      <div className="mt-10 rounded-xl border border-border/40 bg-card/30 p-4 text-xs text-muted-foreground space-y-1">
        <p>
          <span className="text-foreground font-medium">Secret</span> fields are stored encrypted in Supabase and never
          exposed in logs or client bundles.
        </p>
        <p>
          Changes take effect on the <span className="text-foreground font-medium">next AI request</span> — no restart
          required.
        </p>
        <p>
          Cloudflare env vars (<code>GROQ_API_KEY</code>, <code>SUPABASE_URL</code>, etc.) act as ultimate fallbacks when a DB value is blank.
        </p>
      </div>
      </div>
      </div>
    </div>
  );
}

// ---------- Root page ----------

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!session) {
    return <LoginForm onLogin={setSession} />;
  }

  return <SettingsPanel session={session} />;
}
