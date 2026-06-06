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

export const Route = createFileRoute("/api/ticket-track")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();

        if (!ref || ref.length < 3) {
          return new Response(JSON.stringify({ error: "Reference required" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const db = adminClient();

          const { data: ticket, error } = await db
            .from("tickets")
            .select("id, reference, status, urgency, category, summary, created_at, updated_at, sla_breached, name, company")
            .eq("reference", ref)
            .single();

          if (error || !ticket) {
            return new Response(JSON.stringify({ error: "Ticket not found" }), {
              status: 404, headers: { "Content-Type": "application/json" },
            });
          }

          // Last public (non-internal) message
          const { data: messages } = await db
            .from("ticket_messages")
            .select("body, direction, created_at")
            .eq("ticket_id", ticket.id)
            .eq("internal_note", false)
            .order("created_at", { ascending: false })
            .limit(3);

          return new Response(JSON.stringify({ ticket, messages: messages ?? [] }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("ticket-track error", err);
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
