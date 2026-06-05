import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function loadAiConfig() {
  const defaults = {
    apiKey: process.env.GROQ_API_KEY ?? process.env.AI_API_KEY ?? "",
    gatewayUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
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
      .in("key", ["ai_api_key", "ai_gateway_url", "ai_model"]);
    const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
    return {
      apiKey: s.ai_api_key || defaults.apiKey,
      gatewayUrl: s.ai_gateway_url || defaults.gatewayUrl,
      model: s.ai_model || defaults.model,
    };
  } catch {
    return defaults;
  }
}

const REPLY_SYSTEM = `You are a senior IT support specialist at LEAFVA, an Ontario IT services company.
Draft a professional, concise reply to the customer based on the ticket context and message thread provided.
Guidelines:
- Address the customer by name if known.
- Acknowledge their issue and show empathy (one sentence).
- Provide clear next steps or a resolution.
- Keep it under 150 words.
- Use a professional but warm tone — no jargon, no emojis.
- Do NOT include subject lines, greetings like "Dear", or sign-offs — just the body text.
Respond with ONLY the reply text, nothing else.`;

export const Route = createFileRoute("/api/ai/reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            summary?: string;
            details?: string;
            customerName?: string;
            messages?: { direction: string; body: string; is_note: boolean }[];
            aiClassification?: {
              root_cause?: string;
              resolution_steps?: string[];
            };
          };

          const { apiKey, gatewayUrl, model } = await loadAiConfig();
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const thread = (body.messages ?? [])
            .filter((m) => !m.is_note)
            .slice(-10)
            .map((m) => `[${m.direction === "inbound" ? "Customer" : "Support"}]: ${m.body}`)
            .join("\n");

          const steps = body.aiClassification?.resolution_steps;
          const userContent = [
            body.customerName && `Customer name: ${body.customerName}`,
            body.summary      && `Issue summary: ${body.summary}`,
            body.details      && `Issue details: ${body.details.slice(0, 1500)}`,
            body.aiClassification?.root_cause && `Root cause: ${body.aiClassification.root_cause}`,
            steps?.length && `Suggested resolution steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
            thread && `Message thread:\n${thread}`,
          ].filter(Boolean).join("\n\n");

          const upstream = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              stream: false,
              messages: [
                { role: "system", content: REPLY_SYSTEM },
                { role: "user",   content: userContent || "Draft a generic follow-up reply." },
              ],
              max_tokens: 300,
              temperature: 0.4,
            }),
          });

          if (!upstream.ok) {
            const txt = await upstream.text().catch(() => "");
            console.error("AI reply error", upstream.status, txt);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          const aiJson = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const reply = (aiJson.choices?.[0]?.message?.content ?? "").trim();

          return new Response(JSON.stringify({ reply }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("reply route error", err);
          return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
