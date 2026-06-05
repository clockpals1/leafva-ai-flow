import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Loader2, Save, Eye, EyeOff, Settings, Bot, Mail, Bell, ShieldCheck, type LucideIcon } from "lucide-react";
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

type Tab = "ai" | "email" | "notifications";

const TAB_META: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "email", label: "Email / Resend", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
];

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
  const [draft, setDraft] = useState(setting.value ?? "");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (v: string) => {
    setDraft(v);
    setDirty(v !== (setting.value ?? ""));
  };

  const handleSave = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    setSaving(true);
    try {
      await onSave(setting.key, draft, token);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const isTextarea = setting.key === "ai_system_prompt";
  const inputCls =
    "flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold font-mono";

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">{setting.label}</label>
          {setting.is_secret && (
            <span className="text-[10px] uppercase tracking-wider bg-gold/10 text-gold px-2 py-0.5 rounded-full">
              Secret
            </span>
          )}
        </div>
        {setting.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        {isTextarea ? (
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
            placeholder={setting.is_secret ? "••••••••••••••••" : "(not set)"}
          />
        )}
        {setting.is_secret && !isTextarea && (
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
      prev.map((s: AppSetting) => (s.key === key ? { ...s, value } : s)),
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
      {loading ? (
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
          Environment variables (<code>LOVABLE_API_KEY</code>, etc.) act as fallbacks when a DB value is blank.
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
