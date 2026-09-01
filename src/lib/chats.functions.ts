import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Conversation = {
  key: string;
  kind: "dm" | "group";
  refId: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string;
  lastMessage: string;
  lastAt: string;
  pinned: boolean;
};

function preview(kind: string, content: string | null) {
  if (kind === "image") return "📷 Photo";
  if (kind === "video") return "🎬 Video";
  if (kind === "voice") return "🎤 Voice message";
  if (kind === "sticker") return "⭐ Sticker";
  return (content ?? "").slice(0, 80);
}

export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: pins }, { data: threads }, { data: memberships }] = await Promise.all([
      supabase.from("conversation_pins").select("kind, ref_id").eq("user_id", userId),
      supabase
        .from("dm_threads")
        .select("id, user_a, user_b, last_message_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("last_message_at", { ascending: false }),
      supabase.from("group_members").select("group_id").eq("user_id", userId),
    ]);

    const pinned = new Set((pins ?? []).map((p) => `${p.kind}:${p.ref_id}`));
    const out: Conversation[] = [];

    const otherIds = (threads ?? []).map((t) => (t.user_a === userId ? t.user_b : t.user_a));
    const profiles: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};
    if (otherIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds);
      for (const row of p ?? []) profiles[row.id] = row;
    }

    for (const t of threads ?? []) {
      const other = t.user_a === userId ? t.user_b : t.user_a;
      const prof = profiles[other];
      const { data: last } = await supabase
        .from("dm_messages")
        .select("kind, content, created_at")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      out.push({
        key: `dm:${t.id}`,
        kind: "dm",
        refId: t.id,
        name: prof?.display_name || prof?.username || "Someone",
        avatarUrl: prof?.avatar_url ?? null,
        subtitle: prof?.username ? `@${prof.username}` : "",
        lastMessage: last ? preview(last.kind, last.content) : "Say hi",
        lastAt: last?.created_at ?? t.last_message_at,
        pinned: pinned.has(`dm:${t.id}`),
      });
    }

    const groupIds = (memberships ?? []).map((m) => m.group_id);
    if (groupIds.length) {
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, slug, topic, cover_url, last_message_at")
        .in("id", groupIds);
      for (const g of groups ?? []) {
        const { data: last } = await supabase
          .from("group_messages")
          .select("kind, content, created_at")
          .eq("group_id", g.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        out.push({
          key: `group:${g.id}`,
          kind: "group",
          refId: g.slug,
          name: g.name,
          avatarUrl: g.cover_url,
          subtitle: g.topic ?? "Group",
          lastMessage: last ? preview(last.kind, last.content) : "No messages yet",
          lastAt: last?.created_at ?? g.last_message_at,
          pinned: pinned.has(`group:${g.id}`),
        });
      }
    }

    out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
    return out;
  });

export const togglePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ kind: z.enum(["dm", "group"]), refId: z.string().min(1), pinned: z.boolean() }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let refId = data.refId;
    if (data.kind === "group" && !/^[0-9a-f-]{36}$/i.test(refId)) {
      const { data: g } = await supabase.from("groups").select("id").eq("slug", refId).maybeSingle();
      if (!g) throw new Error("Group not found");
      refId = g.id;
    }
    if (data.pinned) {
      await supabase.from("conversation_pins").upsert({ user_id: userId, kind: data.kind, ref_id: refId }, { onConflict: "user_id,kind,ref_id" });
    } else {
      await supabase.from("conversation_pins").delete().eq("user_id", userId).eq("kind", data.kind).eq("ref_id", refId);
    }
    return { ok: true };
  });

export const searchPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ q: z.string().max(60).default("") }).parse(v))
  .handler(async ({ context, data }) => {
    let query = context.supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", context.userId).limit(20);
    if (data.q.trim()) query = query.or(`username.ilike.%${data.q.trim()}%,display_name.ilike.%${data.q.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const openThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ otherId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.otherId === userId) throw new Error("You cannot message yourself.");
    const [a, b] = [userId, data.otherId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();
    if (existing) return { id: existing.id };
    const { data: row, error } = await supabase.from("dm_threads").insert({ user_a: a, user_b: b }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ threadId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: t, error } = await supabase
      .from("dm_threads")
      .select("id, user_a, user_b")
      .eq("id", data.threadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Conversation not found");
    const other = t.user_a === userId ? t.user_b : t.user_a;
    const { data: prof } = await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", other).maybeSingle();
    const { data: messages } = await supabase
      .from("dm_messages")
      .select("id, sender_id, kind, content, media_url, duration_ms, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true })
      .limit(300);
    return { other: prof, messages: messages ?? [] };
  });

export const sendDm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        kind: z.enum(["text", "image", "video", "voice", "sticker"]),
        content: z.string().max(4000).optional(),
        mediaUrl: z.string().url().optional(),
        durationMs: z.number().int().nonnegative().optional(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("dm_messages").insert({
      thread_id: data.threadId,
      sender_id: userId,
      kind: data.kind,
      content: data.content ?? null,
      media_url: data.mediaUrl ?? null,
      duration_ms: data.durationMs ?? null,
    });
    if (error) throw new Error(error.message);

    const { data: t } = await supabase.from("dm_threads").select("user_a, user_b").eq("id", data.threadId).maybeSingle();
    if (t) {
      const other = t.user_a === userId ? t.user_b : t.user_a;
      await supabase.from("notifications").insert({
        user_id: other,
        kind: "dm",
        payload: { thread_id: data.threadId, from: userId, preview: preview(data.kind, data.content ?? null) },
      } as never);
    }
    return { ok: true };
  });
