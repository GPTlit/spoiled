import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_banned, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

const BanInput = z.object({ userId: z.string().uuid(), banned: z.boolean() });
export const adminSetBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => BanInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_banned: data.banned }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeletePostInput = z.object({ postId: z.string().uuid() });
export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => DeletePostInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("posts").delete().eq("id", data.postId);
    return { ok: true };
  });

const DeleteGroupInput = z.object({ groupId: z.string().uuid() });
export const adminDeleteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => DeleteGroupInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("groups").delete().eq("id", data.groupId);
    return { ok: true };
  });

const Broadcast = z.object({ message: z.string().min(1).max(400) });
export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Broadcast.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.from("profiles").select("id");
    if (!users?.length) return { ok: true, sent: 0 };
    const rows = users.map((u) => ({
      user_id: u.id,
      kind: "broadcast",
      payload: { message: data.message },
    }));
    await supabaseAdmin.from("notifications").insert(rows as never);
    return { ok: true, sent: users.length };
  });
