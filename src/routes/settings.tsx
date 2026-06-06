import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot, Mail, Server, Bell, Save, RefreshCw, Eye, EyeOff,
  ToggleLeft, ToggleRight, Loader2, Key, Globe, Shield,
} from "lucide-react";

type AppSetting = {
  id: string;
  key: string;
  value: string;
  is_secret: boolean;
  category: string;
  label: string;
  description: string | null;
};

const TABS = [
  { key: "ai", label: "AI", icon: Bot },
  { key: "email", label: "Email", icon: Mail },
  { key: "smtp", label: "SMTP", icon: Server },
  { key: "notifications", label: "Notifications", icon: Bell },
] as const;

const BOOLEAN_KEYS = ["notify_new_ticket", "notify_ticket_update", "notify_status_change", "notify_assignment", "smtp_secure", "ai_classify_auto"];

function SettingsPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<keyof typeof TABS>("ai");
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate({ to: "/tickets" }); return; }
      setSession(data.session);
    });
  }, [navigate]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load settings");
      const json = await res.json() as { settings: AppSetting[] };
      setSettings(json.settings ?? []);
    } catch (e) {
      toast.error("Could not load settings");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session.access_token]);

  useEffect(() => { if (session) fetchSettings(); }, [session, fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const toggleBoolean = (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return;
    updateSetting(key, setting.value === "true" ? "false" : "true");
  };

  const tabSettings = settings.filter(s => s.category === activeTab);
  const navUser = { name: session?.user?.user_metadata?.full_name, email: session?.user?.email };

  if (!session) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-6 w-6 animate-spin text-green-400" />
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <DashboardNav user={navUser} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800/70 bg-slate-950/95 px-5 backdrop-blur">
          <h1 className="text-sm font-semibold text-slate-200">Settings</h1>
          <div className="flex items-center gap-2">
            <button onClick={fetchSettings} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
              <RefreshCw size={15} />
            </button>
            <button onClick={saveSettings} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-green-400 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <aside className="w-48 border-r border-slate-800/60 bg-slate-950/50 p-3">
            <div className="space-y-0.5">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    activeTab === tab.key
                      ? "bg-green-500/15 text-green-400"
                      : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-100 capitalize">{activeTab} Configuration</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeTab === "ai" && "Configure AI model and classification settings"}
                    {activeTab === "email" && "Configure email delivery via Resend"}
                    {activeTab === "smtp" && "Configure custom SMTP server"}
                    {activeTab === "notifications" && "Configure notification preferences"}
                  </p>
                </div>

                <div className="space-y-4">
                  {tabSettings.map(setting => (
                    <div key={setting.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-200 mb-1">{setting.label}</label>
                          {setting.description && (
                            <p className="text-[10px] text-slate-500 mb-2">{setting.description}</p>
                          )}
                          
                          {BOOLEAN_KEYS.includes(setting.key) ? (
                            <button
                              onClick={() => toggleBoolean(setting.key)}
                              className="flex items-center gap-2"
                            >
                              {setting.value === "true" ? (
                                <ToggleRight size={24} className="text-green-400" />
                              ) : (
                                <ToggleLeft size={24} className="text-slate-600" />
                              )}
                              <span className="text-xs text-slate-400">
                                {setting.value === "true" ? "Enabled" : "Disabled"}
                              </span>
                            </button>
                          ) : setting.key === "email_provider" ? (
                            <select
                              value={setting.value}
                              onChange={e => updateSetting(setting.key, e.target.value)}
                              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 outline-none focus:border-green-500/40"
                            >
                              <option value="resend">Resend</option>
                              <option value="smtp">SMTP</option>
                            </select>
                          ) : (
                            <div className="relative">
                              <input
                                type={setting.is_secret && !showSecrets[setting.key] ? "password" : "text"}
                                value={setting.value}
                                onChange={e => updateSetting(setting.key, e.target.value)}
                                placeholder={setting.is_secret ? "••••••••" : ""}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-green-500/40 pr-16"
                              />
                              {setting.is_secret && (
                                <button
                                  onClick={() => setShowSecrets(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                  {showSecrets[setting.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {tabSettings.length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
                    <Shield size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500">No settings configured for this category</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
