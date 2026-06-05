import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, ticketReplyCustomerHtml } from "@/lib/email";

export const Route = createFileRoute("/api/email/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          const token = authHeader?.replace("Bearer ", "");
          if (!token) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const url = process.env.SUPABASE_URL;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!url || !serviceKey) {
            return new Response(JSON.stringify({ error: "Server misconfigured" }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          const db = createClient<Database>(url, serviceKey, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data: { user }, error: authErr } = await db.auth.getUser(token);
          if (authErr || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json() as {
            type?: string;
            ticketId?: string;
            messageBody?: string;
          };

          if (body.type !== "reply" || !body.ticketId || !body.messageBody) {
            return new Response(JSON.stringify({ error: "Invalid request" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          const { data: settingsRows } = await db
            .from("app_settings")
            .select("key, value")
            .in("key", ["resend_api_key", "resend_from_email", "notify_ticket_update"]);

          const cfg: Record<string, string> = {};
          for (const row of settingsRows ?? []) cfg[row.key] = row.value ?? "";

          const apiKey = cfg.resend_api_key;
          const fromEmail = cfg.resend_from_email;
          const notifyUpdates = cfg.notify_ticket_update !== "false";

          if (!apiKey || !fromEmail || !notifyUpdates) {
            return new Response(JSON.stringify({ ok: true, skipped: "email not configured" }), {
              status: 200, headers: { "Content-Type": "application/json" },
            });
          }

          const [{ data: ticket }, { data: staffRow }] = await Promise.all([
            db.from("tickets").select("reference, name, email").eq("id", body.ticketId).single(),
            db.from("staff").select("name").eq("user_id", user.id).single(),
          ]);

          if (!ticket?.email) {
            return new Response(JSON.stringify({ ok: true, skipped: "no customer email" }), {
              status: 200, headers: { "Content-Type": "application/json" },
            });
          }

          const html = ticketReplyCustomerHtml({
            reference: ticket.reference ?? "",
            customerName: ticket.name,
            replyBody: body.messageBody,
            staffName: staffRow?.name,
          });

          const result = await sendEmail(
            ticket.email,
            `Re: Your support request [${ticket.reference}]`,
            html,
            { apiKey, fromEmail, fromName: "LEAFVA Support" },
          );

          if (result.ok) {
            await db.from("email_threads").insert({
              ticket_id: body.ticketId,
              resend_email_id: result.id ?? null,
              direction: "outbound",
              subject: `Re: Your support request [${ticket.reference}]`,
              from_address: fromEmail,
              to_address: ticket.email,
              status: "sent",
            } as never);
          }

          return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[api/email/send]", err);
          return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
