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

const CLASSIFY_SYSTEM = `You are an expert IT support triage AI for LEAFVA, an Ontario IT services company.
Given a support ticket, respond ONLY with a single valid JSON object (no markdown, no explanation) matching this schema:
{
  "category": string,        // e.g. "Networking", "Hardware", "Software", "Security", "AI/ML", "Other"
  "urgency": string,         // one of: "low", "medium", "high", "emergency"
  "confidence": number,      // 0.0 – 1.0
  "root_cause": string,      // one sentence
  "resolution_steps": string[], // 2–5 concise action steps
  "suggested_reply": string  // professional reply to send to the customer (2–4 sentences)
}`;

export const Route = createFileRoute("/api/ai/classify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            ticketId: string;
            summary?: string;
            details?: string;
            transcript?: string;
            name?: string;
            company?: string;
            category?: string;
          };

          if (!body.ticketId) {
            return new Response(JSON.stringify({ error: "ticketId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { apiKey, gatewayUrl, model } = await loadAiConfig();
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const userContent = [
            body.name      && `Customer: ${body.name}${body.company ? ` (${body.company})` : ""}`,
            body.category  && `Category hint: ${body.category}`,
            body.summary   && `Summary: ${body.summary}`,
            body.details   && `Details:\n${body.details.slice(0, 3000)}`,
            body.transcript && `Chat transcript:\n${body.transcript.slice(0, 2000)}`,
          ].filter(Boolean).join("\n\n");

          const t0 = Date.now();
          const upstream = await fetch(gatewayUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              stream: false,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: CLASSIFY_SYSTEM },
                { role: "user",   content: userContent || "No ticket content provided." },
              ],
              max_tokens: 800,
              temperature: 0.2,
            }),
          });

          if (!upstream.ok) {
            const txt = await upstream.text().catch(() => "");
            console.error("AI classify error", upstream.status, txt);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }

          const processingMs = Date.now() - t0;
          const aiJson = (await upstream.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { total_tokens?: number };
          };

          const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(raw); } catch { parsed = {}; }

          const classification = {
            category:          String(parsed.category        ?? "Other"),
            urgency:           String(parsed.urgency         ?? "medium"),
            confidence:        Number(parsed.confidence      ?? 0.5),
            root_cause:        String(parsed.root_cause      ?? ""),
            resolution_steps:  Array.isArray(parsed.resolution_steps) ? parsed.resolution_steps as string[] : [],
            suggested_reply:   String(parsed.suggested_reply ?? ""),
          };

          const supaUrl = process.env.SUPABASE_URL;
          const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supaUrl && supaKey) {
            const db = createClient<Database>(supaUrl, supaKey, {
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            });
            await db.from("ai_classifications").upsert(
              {
                ticket_id:          body.ticketId,
                model_used:         model,
                detected_category:  classification.category,
                detected_urgency:   classification.urgency as never,
                confidence_score:   classification.confidence,
                root_cause:         classification.root_cause,
                resolution_steps:   classification.resolution_steps,
                suggested_response: classification.suggested_reply,
                processing_time_ms: processingMs,
                tokens_used:        aiJson.usage?.total_tokens ?? null,
              },
              { onConflict: "ticket_id" },
            );
          }

          return new Response(JSON.stringify(classification), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("classify route error", err);
          return new Response(JSON.stringify({ error: "Unexpected error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
