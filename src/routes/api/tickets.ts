import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

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
            .select("reference")
            .single();

          if (error) {
            console.error("ticket insert error", error);
            return new Response(JSON.stringify({ error: "Could not create ticket" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

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
