import { createFileRoute } from "@tanstack/react-router";
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

async function getStaff(token: string) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  const authClient = createClient<Database>(url, anonKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  const db = adminClient();
  const { data: staff } = await db.from("staff").select("id, role").eq("user_id", user.id).single();
  return staff;
}

export const Route = createFileRoute("/api/remote-sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
        const staff = await getStaff(token);
        if (!staff) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const url = new URL(request.url);
        const ticketId = url.searchParams.get("ticketId");
        if (!ticketId) return new Response(JSON.stringify({ error: "ticketId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

        const db = adminClient();
        const { data, error } = await db
          .from("remote_sessions")
          .select("*, requested_by_staff:staff!remote_sessions_requested_by_fkey(id, name), approved_by_staff:staff!remote_sessions_approved_by_fkey(id, name)")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: false });

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(data ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
      },

      POST: async ({ request }) => {
        const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
        const staff = await getStaff(token);
        if (!staff) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const body = await request.json() as {
          action: string;
          ticket_id?: string;
          session_id?: string;
          session_type?: string;
          session_tool?: string;
          session_url?: string;
          session_notes?: string;
        };
        const { action } = body;
        const db = adminClient();

        if (action === "request") {
          const { ticket_id, session_type, session_tool, session_url } = body;
          if (!ticket_id) return new Response(JSON.stringify({ error: "ticket_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });

          const { data: session, error } = await db
            .from("remote_sessions")
            .insert({
              ticket_id,
              requested_by: staff.id,
              session_type: session_type ?? "remote",
              session_tool: session_tool ?? null,
              session_url: session_url ?? null,
              status: "pending",
            } as never)
            .select()
            .single();

          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });

          await db.from("tickets").update({ status: "remote_session_active" as never }).eq("id", ticket_id);
          await db.from("ticket_history").insert({
            ticket_id,
            staff_id: staff.id,
            action: "remote_session_requested",
            note: `Remote session requested by staff`,
          } as never);

          return new Response(JSON.stringify(session), { status: 201, headers: { "Content-Type": "application/json" } });
        }

        if (action === "start") {
          const { session_id, session_url } = body;
          if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });

          const { data: session, error } = await db
            .from("remote_sessions")
            .update({ status: "active", started_at: new Date().toISOString(), session_url: session_url ?? undefined } as never)
            .eq("id", session_id)
            .select()
            .single();

          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify(session), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (action === "end") {
          const { session_id, session_notes } = body;
          if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });

          const { data: existing } = await db.from("remote_sessions").select("started_at, ticket_id").eq("id", session_id).single();
          const endedAt = new Date();
          const durationMinutes = existing?.started_at
            ? Math.round((endedAt.getTime() - new Date(existing.started_at).getTime()) / 60000)
            : null;

          const { data: session, error } = await db
            .from("remote_sessions")
            .update({
              status: "completed",
              ended_at: endedAt.toISOString(),
              duration_minutes: durationMinutes,
              session_notes: session_notes ?? null,
            } as never)
            .eq("id", session_id)
            .select()
            .single();

          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });

          if (existing?.ticket_id) {
            await db.from("tickets").update({ status: "in_progress" as never }).eq("id", existing.ticket_id);
            await db.from("ticket_history").insert({
              ticket_id: existing.ticket_id,
              staff_id: staff.id,
              action: "remote_session_ended",
              note: `Session ended. Duration: ${durationMinutes ?? 0}m. ${session_notes ?? ""}`.trim(),
            } as never);
          }

          return new Response(JSON.stringify(session), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (action === "cancel") {
          const { session_id } = body;
          if (!session_id) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });

          const { data: existing } = await db.from("remote_sessions").select("ticket_id").eq("id", session_id).single();
          const { data: session, error } = await db
            .from("remote_sessions")
            .update({ status: "cancelled" } as never)
            .eq("id", session_id)
            .select()
            .single();

          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });

          if (existing?.ticket_id) {
            await db.from("tickets").update({ status: "in_progress" as never }).eq("id", existing.ticket_id);
          }

          return new Response(JSON.stringify(session), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
