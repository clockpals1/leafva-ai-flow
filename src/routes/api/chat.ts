import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are the LEAFVA AI Assistant — a premium intake and triage specialist for LEAFVA, an Ontario-registered IT services company.

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

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safe],
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
