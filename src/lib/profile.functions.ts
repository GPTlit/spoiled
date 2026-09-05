import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, is_banned")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return { ...(data ?? { id: context.userId }), roles: (roles ?? []).map((r) => r.role) };
  });

const SetUsernameInput = z.object({
  username: z.string().min(3).max(24).regex(/^[a-z0-9_]+$/i, "letters, numbers, underscore only"),
});

export const setUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SetUsernameInput.parse(v))
  .handler(async ({ context, data }) => {
    const desired = data.username.toLowerCase();
    const { data: taken } = await context.supabase.from("profiles").select("id").eq("username", desired).maybeSingle();
    if (taken && taken.id !== context.userId) throw new Error("Username is taken");
    const { error } = await context.supabase.from("profiles").update({ username: desired }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, username: desired };
  });

const UpdateProfileInput = z.object({
  display_name: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(400).optional(),
  avatar_url: z.string().trim().max(600).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => UpdateProfileInput.parse(v))
  .handler(async ({ context, data }) => {
    const patch: { display_name?: string | null; bio?: string | null; avatar_url?: string | null } = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name || null;
    if (data.bio !== undefined) patch.bio = data.bio || null;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url || null;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
