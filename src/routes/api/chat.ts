import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const DEFAULT_SYSTEM_PROMPT = `You are the LEAFVA AI Assistant — a premium intake and triage specialist for LEAFVA, an Ontario-registered IT services company.

LEAFVA offers: IT support, AI services & integrations, networking & infrastructure, system administration, custom applications, and full IT projects.

Your job:
1. Greet the visitor warmly but concisely (one sentence).
2. Identify the request category (IT support, AI, networking, sys-admin, application, project, other).
3. Identify urgency: low, medium, high, or emergency.
4. Gather a short description of the issue or goal, business/system context, and approximate scale (users / devices affected).
5. Collect contact details: name, email, optionally company and phone.
6. Once you have category, urgency, a description, name, and email — confirm everything in a tidy summary and tell the user a ticket has been created and a specialist will follow up by email.

Style:
- Sharp, corporate, calm. Tesla-meets-natural premium tone.
- One focused question per turn. No long monologues.
- Use Markdown sparingly (occasional **bold**), no emojis.
- Never invent prices, SLAs, or promise specific timelines.
- If asked something unrelated, politely redirect to the intake.
- Recommend "emergency" routing if the user mentions outage, breach, data loss, or production-down.

You are not a generic chatbot — you are LEAFVA's front desk.`;

/** Load AI configuration from the app_settings table, falling back to env vars. */
async function loadAiConfig() {
  const defaults = {
    apiKey: process.env.GROQ_API_KEY ?? process.env.AI_API_KEY ?? "",
    gatewayUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  };

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return defaults;

    const db = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data } = await db
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_api_key", "ai_gateway_url", "ai_model", "ai_system_prompt"]);

    const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));

    return {
      apiKey: s.ai_api_key || defaults.apiKey,
      gatewayUrl: s.ai_gateway_url || defaults.gatewayUrl,
      model: s.ai_model || defaults.model,
      systemPrompt: s.ai_system_prompt || defaults.systemPrompt,
    };
  } catch {
    return defaults;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
          };

          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: "messages required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Trim to last 30 messages and basic length cap
          const safe = messages.slice(-30).map((m) => ({
            role: m.role,
            content: String(m.content ?? "").slice(0, 4000),
          }));

          const { apiKey, gatewayUrl, model, systemPrompt } = await loadAiConfig();
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const upstream = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              stream: true,
              messages: [{ role: "system", content: systemPrompt }, ...safe],
            }),
          });

          if (upstream.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
          if (upstream.status === 402) {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Please contact the LEAFVA team." }),
              { status: 402, headers: { "Content-Type": "application/json" } },
            );
          }
          if (!upstream.ok || !upstream.body) {
            const txt = await upstream.text().catch(() => "");
            console.error("AI gateway error", upstream.status, txt);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (err) {
          console.error("chat route error", err);
          return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
