import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Ticket, Settings, LogOut, Users, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface NavUser {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface DashboardNavProps {
  user?: NavUser;
}

const LINKS = [
  { to: "/tickets", icon: Ticket, label: "Service Desk" },
  { to: "/admin",   icon: Settings, label: "Settings" },
] as const;

const COMING_SOON = [
  { icon: Users,      label: "Staff" },
  { icon: BarChart3,  label: "Reports" },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = (user?.name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <aside className="flex w-14 lg:w-52 shrink-0 flex-col h-screen sticky top-0 bg-slate-950 border-r border-slate-800/70 z-20">

      {/* ── Logo ── */}
      <div className="flex h-14 items-center justify-center lg:justify-start gap-2.5 lg:px-4 border-b border-slate-800/70 shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-green-500/30">
          <Ticket size={16} className="text-green-400" />
        </div>
        <div className="hidden lg:block">
          <p className="text-[10px] font-bold tracking-widest text-green-400 uppercase leading-none">LEAFVA</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Dashboard</p>
        </div>
      </div>

      {/* ── Primary nav ── */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3 overflow-y-auto">
        {LINKS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors ${
                active
                  ? "bg-green-500/15 text-green-400 ring-1 ring-green-500/20"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="hidden lg:block text-sm font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Coming soon */}
        <div className="mt-3 pt-3 border-t border-slate-800/40 space-y-0.5">
          {COMING_SOON.map(({ icon: Icon, label }) => (
            <div
              key={label}
              title={`${label} — coming soon`}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-slate-700 cursor-not-allowed select-none"
            >
              <Icon size={17} className="shrink-0" />
              <span className="hidden lg:flex lg:flex-1 items-center justify-between text-sm font-medium">
                {label}
                <span className="text-[9px] uppercase tracking-wider bg-slate-800/80 text-slate-600 px-1.5 py-0.5 rounded">
                  soon
                </span>
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* ── User + logout ── */}
      <div className="shrink-0 border-t border-slate-800/70 p-2 space-y-0.5">
        {user && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-600"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-[11px] font-semibold text-green-400 ring-1 ring-green-500/25">
                {initials}
              </div>
            )}
            <div className="hidden lg:block overflow-hidden">
              {user.name && (
                <p className="text-xs font-medium text-slate-300 truncate leading-tight">{user.name}</p>
              )}
              <p className="text-[10px] text-slate-500 truncate leading-tight">
                {user.email ?? ""}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-slate-600 transition hover:bg-slate-800/60 hover:text-red-400"
        >
          <LogOut size={15} className="shrink-0" />
          <span className="hidden lg:block text-xs font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
