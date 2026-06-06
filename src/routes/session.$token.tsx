import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, MonitorPlay, AlertTriangle, ShieldCheck } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function SessionApprovalPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const db = adminClient();
        const { data, error } = await db
          .from("remote_sessions")
          .select("*, ticket:tickets!remote_sessions_ticket_id_fkey(id, summary, name, company), requested_by_staff:staff!remote_sessions_requested_by_fkey(name)")
          .eq("approval_token", token)
          .single();
        
        if (error || !data) {
          setError("Invalid or expired session token");
          setLoading(false);
          return;
        }
        
        if (data.status !== "pending") {
          setError(`Session already ${data.status}`);
          setLoading(false);
          return;
        }
        
        setSession(data);
        setLoading(false);
      } catch (e) {
        setError("Failed to load session");
        setLoading(false);
      }
    };
    loadSession();
  }, [token]);

  const handleAction = async (approved: boolean) => {
    setProcessing(true);
    try {
      const db = adminClient();
      const { error } = await db
        .from("remote_sessions")
        .update({
          status: approved ? "approved" : "denied",
          approved_at: new Date().toISOString(),
        } as never)
        .eq("id", session.id);
      
      if (error) throw error;
      
      if (approved) {
        const { error: ticketError } = await db
          .from("tickets")
          .update({ status: "remote_session_active" as never })
          .eq("id", session.ticket_id);
        if (ticketError) throw ticketError;
      }
      
      navigate({ to: `/session/${token}/result`, search: { approved: approved.toString() } });
    } catch (e) {
      setError("Failed to process request");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading session request...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-lg font-semibold text-red-300 mb-2">Session Not Found</h1>
          <p className="text-sm text-slate-400">{error || "This session request is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <MonitorPlay className="h-8 w-8 text-gold" />
          </div>
          <h1 className="text-xl font-semibold text-slate-200 mb-2">Remote Session Request</h1>
          <p className="text-sm text-slate-400">
            {session.requested_by_staff?.name || "A support technician"} is requesting remote access to help resolve your issue.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-600">Ticket</p>
            <p className="mt-0.5 text-sm text-slate-300">{session.ticket?.summary || "Support Request"}</p>
          </div>
          {session.ticket?.company && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-600">Company</p>
              <p className="mt-0.5 text-sm text-slate-300">{session.ticket.company}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-600">Session Type</p>
            <p className="mt-0.5 text-sm text-slate-300 capitalize">{session.session_type}</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400">
            <p className="font-medium text-amber-300 mb-1">Security Notice</p>
            <p>By approving this request, you authorize the technician to remotely access your device. You can end the session at any time.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleAction(false)}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Deny
          </button>
          <button
            onClick={() => handleAction(true)}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-medium text-gold-foreground hover:bg-gold/90 transition disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/session/$token")({
  component: SessionApprovalPage,
});
