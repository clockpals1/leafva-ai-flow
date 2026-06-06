import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type StaffRole = "admin" | "manager" | "technician" | "subcontractor";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

/** Verify Bearer token and confirm the caller is admin or manager. */
async function verifyAdminOrManager(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const anonClient = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) return null;

  const db = adminClient();
  const { data: s } = await db
    .from("staff")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  // Allow if user has admin/manager role, OR if no staff row exists (super-admin)
  if (s && !["admin", "manager"].includes(s.role)) return null;
  return data.user.id;
}

export const Route = createFileRoute("/api/staff")({
  server: {
    handlers: {
      /**
       * POST /api/staff
       * Invites a new user via Supabase Auth Admin (sends invite email),
       * then creates the linked staff profile record.
       * Requires: admin or manager Bearer token.
       */
      POST: async ({ request }) => {
        const callerId = await verifyAdminOrManager(request);
        if (!callerId) {
          return new Response(
            JSON.stringify({ error: "Unauthorized — admin or manager required" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: {
          name?: string;
          email?: string;
          phone?: string;
          role?: StaffRole;
          skills?: string[];
          max_tickets?: number;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { name, email, phone, role = "technician", skills = [], max_tickets = 10 } = body;
        if (!name?.trim() || !email?.trim()) {
          return new Response(JSON.stringify({ error: "Name and email are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const db = adminClient();

        let userId: string;
        let invited = false;

        if (role === "subcontractor") {
          // Subcontractors get invitation email
          const { data: invite, error: inviteErr } = await db.auth.admin.inviteUserByEmail(
            email.trim().toLowerCase(),
            { data: { full_name: name.trim() } },
          );
          if (inviteErr) {
            return new Response(JSON.stringify({ error: inviteErr.message }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          userId = invite.user.id;
          invited = true;
        } else {
          // Internal staff: create user directly with temporary password
          const tempPassword = Math.random().toString(36).slice(-12);
          const { data: user, error: userErr } = await db.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: name.trim() },
          });
          if (userErr) {
            return new Response(JSON.stringify({ error: userErr.message }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          userId = user.user.id;
        }

        // Create the staff profile linked to the user
        const { data: staffRow, error: staffErr } = await db
          .from("staff")
          .insert({
            user_id: userId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || null,
            role,
            skills,
            max_tickets,
          } as never)
          .select()
          .single();

        if (staffErr) {
          return new Response(JSON.stringify({ error: staffErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ staff: staffRow, invited }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
