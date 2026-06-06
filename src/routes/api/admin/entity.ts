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

async function verifyAuth(request: Request): Promise<boolean> {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;

  // Verify the token using the service-role client so it never depends on the
  // publishable key being present on the server (a common cause of 401s).
  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return false;

  // Check if user has admin/manager role, or is super-admin (no staff row)
  const { data: staff } = await db
    .from("staff")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  // Allow if user has admin/manager role, OR if no staff row exists (super-admin)
  if (staff && !["admin", "manager"].includes(staff.role)) return false;
  return true;
}

export const Route = createFileRoute("/api/admin/entity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ok = await verifyAuth(request);
        if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const db = adminClient();

        if (type === "categories") {
          const { data, error } = await db.from("ticket_categories").select("*").order("sort_order");
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (type === "sla") {
          const { data, error } = await db.from("sla_policies").select("*").order("is_default", { ascending: false }).order("name");
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: "Unknown type" }), { status: 400, headers: { "Content-Type": "application/json" } });
      },

      POST: async ({ request }) => {
        const ok = await verifyAuth(request);
        if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

        const body = await request.json() as { type: string; action: string; data: Record<string, unknown> };
        const { type, action, data } = body;
        const db = adminClient();

        if (type === "categories") {
          if (action === "create") {
            const slug = (data.slug as string) || (data.name as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            const { data: row, error } = await db.from("ticket_categories").insert({ ...data, slug }).select().single();
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify(row), { status: 201, headers: { "Content-Type": "application/json" } });
          }
          if (action === "update") {
            const { id, created_at, updated_at, ...rest } = data as Record<string, unknown>;
            const { data: row, error } = await db.from("ticket_categories").update(rest).eq("id", id as string).select().single();
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify(row), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          if (action === "delete") {
            const { error } = await db.from("ticket_categories").delete().eq("id", data.id as string);
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }

        if (type === "sla") {
          if (action === "create") {
            const { data: row, error } = await db.from("sla_policies").insert(data as never).select().single();
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify(row), { status: 201, headers: { "Content-Type": "application/json" } });
          }
          if (action === "update") {
            const { id, created_at, updated_at, ...rest } = data as Record<string, unknown>;
            const { data: row, error } = await db.from("sla_policies").update(rest).eq("id", id as string).select().single();
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify(row), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          if (action === "delete") {
            const { error } = await db.from("sla_policies").delete().eq("id", data.id as string);
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }

        return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
