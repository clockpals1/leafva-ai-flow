import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Verify the Bearer token and return the Supabase user, or null. */
async function verifyAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** Admin Supabase client (service role — bypasses RLS). */
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      /** GET /api/admin/settings — list all settings (auth required) */
      GET: async ({ request }) => {
        const userId = await verifyAuth(request);
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const db = adminClient();
          const { data, error } = await db
            .from("app_settings")
            .select("key, value, is_secret, category, label, description, updated_at")
            .order("category")
            .order("key");

          if (error) throw error;

          // Mask secret values in the response so they never leave the server
          const settings = (data ?? []).map((row) => ({
            ...row,
            value: row.is_secret && row.value ? "••••••••" : (row.value ?? ""),
          }));

          return new Response(JSON.stringify({ settings }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("admin settings GET error", err);
          return new Response(JSON.stringify({ error: "Could not load settings" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      /** POST /api/admin/settings — upsert one setting (auth required) */
      POST: async ({ request }) => {
        const userId = await verifyAuth(request);
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { key?: string; value?: string };
        try {
          body = (await request.json()) as { key?: string; value?: string };
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { key, value } = body;
        if (!key || typeof key !== "string" || key.length > 100) {
          return new Response(JSON.stringify({ error: "Invalid key" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (typeof value !== "string" || value.length > 10000) {
          return new Response(JSON.stringify({ error: "Invalid value" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Don't allow saving a masked placeholder as the real value
        if (value === "••••••••") {
          return new Response(JSON.stringify({ ok: true, note: "placeholder not saved" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const db = adminClient();
          const { error } = await db
            .from("app_settings")
            .update({ value, updated_by: userId })
            .eq("key", key);

          if (error) throw error;

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("admin settings POST error", err);
          return new Response(JSON.stringify({ error: "Could not save setting" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
