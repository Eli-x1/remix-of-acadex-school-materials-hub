import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Resolve a username to its email so users can sign in with either.
// Returns email or null. No auth required (only exposes email if username matches).
export const resolveUsernameToEmail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: z.string().min(1).max(255) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .ilike("username", data.username)
      .maybeSingle();
    return { email: prof?.email ?? null };
  });

// Create a school admin auth user (super_admin only).
export const createSchoolAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      schoolId: z.string().uuid(),
      email: z.string().email(),
      password: z.string().min(6).max(200),
      name: z.string().min(1).max(200),
      username: z.string().min(1).max(100).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify caller is super_admin
    const { data: isSuper } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isSuper) throw new Response("Forbidden", { status: 403 });

    // Create the auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, username: data.username ?? null },
    });
    if (createErr || !created.user) {
      throw new Response(createErr?.message ?? "Failed to create user", { status: 400 });
    }
    const newUserId = created.user.id;

    // Update profile with school + username (handle_new_user trigger inserted defaults)
    const { error: profErr } = await supabaseAdmin.from("profiles").update({
      school_id: data.schoolId,
      name: data.name,
      username: data.username ?? null,
    }).eq("id", newUserId);
    if (profErr) throw new Response(profErr.message, { status: 500 });

    // Replace role with school_admin
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "school_admin",
    });
    if (roleErr) throw new Response(roleErr.message, { status: 500 });

    return { ok: true, userId: newUserId };
  });
