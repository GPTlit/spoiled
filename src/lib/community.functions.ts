import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listGroups = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client
    .from("groups")
    .select("id, slug, name, topic, cover_url, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data ?? [];
});

const CreateGroup = z.object({
  name: z.string().trim().min(2).max(60),
  topic: z.string().trim().max(240).optional(),
});
export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CreateGroup.parse(v))
  .handler(async ({ context, data }) => {
    const base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "group";
    let slug = base;
    let n = 0;
    while (true) {
      const { data: existing } = await context.supabase.from("groups").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      n++;
      slug = `${base}-${n}`;
    }
    const { data: row, error } = await context.supabase
      .from("groups")
      .insert({ name: data.name, topic: data.topic, slug, created_by: context.userId })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("group_members").insert({ group_id: row.id, user_id: context.userId });
    return row;
  });

const SlugInput = z.object({ slug: z.string().min(1).max(60) });

export const getGroup = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => SlugInput.parse(v))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: g, error } = await client
      .from("groups")
      .select("id, slug, name, topic, cover_url, created_by, created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) throw new Error("Group not found");
    const { count } = await client.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", g.id);
    return { ...g, member_count: count ?? 0 };
  });

const IdInput = z.object({ groupId: z.string().uuid() });

export const joinGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => IdInput.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("group_members")
      .upsert({ group_id: data.groupId, user_id: context.userId }, { onConflict: "group_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => IdInput.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("group_members")
      .delete()
      .eq("group_id", data.groupId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => IdInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", data.groupId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { member: !!row };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => IdInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("group_messages")
      .select("id, group_id, user_id, kind, content, media_url, duration_ms, created_at")
      .eq("group_id", data.groupId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profiles: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length) {
      const { data: p } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      for (const row of p ?? []) profiles[row.id] = { username: row.username, display_name: row.display_name, avatar_url: row.avatar_url };
    }
    return (rows ?? []).map((r) => ({ ...r, author: profiles[r.user_id] ?? null }));
  });

const SendMessage = z.object({
  groupId: z.string().uuid(),
  kind: z.enum(["text", "image", "video", "voice", "sticker"]),
  content: z.string().max(4000).optional(),
  mediaUrl: z.string().url().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SendMessage.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("group_messages").insert({
      group_id: data.groupId,
      user_id: context.userId,
      kind: data.kind,
      content: data.content ?? null,
      media_url: data.mediaUrl ?? null,
      duration_ms: data.durationMs ?? null,
    });
    if (error) throw new Error(error.message);
    // fan-out notifications to other members
    const { data: members } = await context.supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", data.groupId);
    const others = (members ?? []).map((m) => m.user_id).filter((id) => id !== context.userId);
    if (others.length) {
      await context.supabase.from("notifications").insert(
        others.map((uid) => ({
          user_id: uid,
          kind: "group_message",
          payload: { group_id: data.groupId, from: context.userId, preview: (data.content ?? data.kind).slice(0, 80) },
        })),
      );
    }
    return { ok: true };
  });
