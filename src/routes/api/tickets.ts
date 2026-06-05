import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail, ticketCreatedCustomerHtml, ticketCreatedStaffHtml } from "@/lib/email";
import type { Database } from "@/integrations/supabase/types";

const TicketSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  urgency: z.enum(["low", "medium", "high", "emergency"]).default("medium"),
  summary: z.string().max(500).optional(),
  details: z.string().max(5000).optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(60)
    .default([]),
});

type TicketInput = {
  name?: string;
  email?: string;
  summary?: string;
  urgency?: "low" | "medium" | "high" | "emergency";
  details?: string;
};

async function fireTicketEmails(ticketId: string, input: TicketInput) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const db = createClient<Database>(url, serviceKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data: settingsRows } = await db
    .from("app_settings")
    .select("key, value")
    .in("key", ["resend_api_key", "resend_from_email", "notification_email", "notify_new_ticket"]);

  const cfg: Record<string, string> = {};
  for (const row of settingsRows ?? []) cfg[row.key] = row.value ?? "";

  const apiKey = cfg.resend_api_key;
  const fromEmail = cfg.resend_from_email;
  const notifyEmail = cfg.notification_email;
  const notifyNew = cfg.notify_new_ticket !== "false";

  if (!apiKey || !fromEmail || !notifyNew) return;

  const { data: ticket } = await db
    .from("tickets")
    .select("reference")
    .eq("id", ticketId)
    .single();

  const reference = ticket?.reference ?? ticketId;
  const emailConfig = { apiKey, fromEmail, fromName: "LEAFVA Support" };

  if (input.email) {
    const html = ticketCreatedCustomerHtml({
      reference,
      customerName: input.name,
      summary: input.summary,
      urgency: input.urgency,
    });
    await sendEmail(
      input.email,
      `Support request received [${reference}]`,
      html,
      emailConfig,
    );
  }

  if (notifyEmail) {
    const html = ticketCreatedStaffHtml({
      reference,
      customerName: input.name,
      customerEmail: input.email,
      summary: input.summary,
      urgency: input.urgency,
      details: input.details,
    });
    await sendEmail(
      notifyEmail,
      `New ticket [${reference}] — ${input.urgency ?? "medium"}: ${input.summary ?? "No summary"}`,
      html,
      emailConfig,
    );
  }
}

export const Route = createFileRoute("/api/tickets")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = TicketSchema.safeParse(json);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid ticket", issues: parsed.error.issues }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { data, error } = await supabase
            .from("tickets")
            .insert({ ...parsed.data, source: "ai-assistant" })
            .select("id, reference")
            .single();

          if (error) {
            console.error("ticket insert error", error);
            return new Response(JSON.stringify({ error: "Could not create ticket" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          fireTicketEmails(data.id, parsed.data).catch(() => {});

          return new Response(JSON.stringify({ reference: data.reference }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("tickets route error", err);
          return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
