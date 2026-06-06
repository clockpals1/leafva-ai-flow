import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Verify the Bearer token and return the Supabase user ID, or null. */
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

  // Check if user has admin/manager role, or is super-admin (no staff row)
  const db = adminClient();
  const { data: staff } = await db
    .from("staff")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  // Allow if user has admin/manager role, OR if no staff row exists (super-admin)
  if (staff && !["admin", "manager"].includes(staff.role)) return null;
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

      /** POST /api/admin/settings — upsert settings (auth required) */
      POST: async ({ request }) => {
        const userId = await verifyAuth(request);
        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { settings?: Array<{ id: string; key: string; value: string; is_secret: boolean }> };
        try {
          body = (await request.json()) as { settings?: Array<{ id: string; key: string; value: string; is_secret: boolean }> };
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { settings } = body;
        if (!settings || !Array.isArray(settings)) {
          return new Response(JSON.stringify({ error: "Invalid settings array" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const db = adminClient();

          // Update each setting, skipping masked placeholders
          for (const setting of settings) {
            if (setting.is_secret && setting.value === "••••••••") {
              continue; // Skip masked secret values
            }
            if (typeof setting.value !== "string" || setting.value.length > 10000) {
              continue; // Skip invalid values
            }

            const { error } = await db
              .from("app_settings")
              .update({ value: setting.value, updated_by: userId })
              .eq("key", setting.key);

            if (error) {
              console.error(`Failed to update setting ${setting.key}:`, error);
            }
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("admin settings POST error", err);
          return new Response(JSON.stringify({ error: "Could not save settings" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
