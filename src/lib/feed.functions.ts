import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
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
}

const ListInput = z.object({ kind: z.enum(["post", "theory", "all"]).default("all") });

export const listFeed = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => ListInput.parse(v ?? {}))
  .handler(async ({ data }) => {
    const client = await publicClient();
    let q = client
      .from("posts")
      .select("id, author_id, kind, title, caption, media_url, media_kind, title_ref, season, episode, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.kind !== "all") q = q.eq("kind", data.kind);
    const { data: posts, error } = await q;
    if (error) throw new Error(error.message);
    const authorIds = Array.from(new Set((posts ?? []).map((p) => p.author_id)));
    const postIds = (posts ?? []).map((p) => p.id);
    const profiles = authorIds.length
      ? (await client.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds)).data ?? []
      : [];
    const likes = postIds.length
      ? (await client.from("post_likes").select("post_id").in("post_id", postIds)).data ?? []
      : [];
    const comments = postIds.length
      ? (await client.from("post_comments").select("post_id").in("post_id", postIds)).data ?? []
      : [];
    const likeCount: Record<string, number> = {};
    const commentCount: Record<string, number> = {};
    for (const l of likes) likeCount[l.post_id] = (likeCount[l.post_id] ?? 0) + 1;
    for (const c of comments) commentCount[c.post_id] = (commentCount[c.post_id] ?? 0) + 1;
    const profileMap: Record<string, (typeof profiles)[number]> = {};
    for (const p of profiles) profileMap[p.id] = p;
    return (posts ?? []).map((p) => ({
      ...p,
      author: profileMap[p.author_id] ?? null,
      like_count: likeCount[p.id] ?? 0,
      comment_count: commentCount[p.id] ?? 0,
    }));
  });

const CreatePost = z.object({
  kind: z.enum(["post", "theory"]).default("post"),
  title: z.string().trim().max(140).optional(),
  caption: z.string().trim().max(4000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaKind: z.enum(["none", "image", "video"]).default("none"),
  titleRef: z.string().trim().max(160).optional(),
  season: z.number().int().nullable().optional(),
  episode: z.number().int().nullable().optional(),
});

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CreatePost.parse(v))
  .handler(async ({ context, data }) => {
    if (!data.caption && !data.title && !data.mediaUrl) throw new Error("Say something first.");
    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        author_id: context.userId,
        kind: data.kind,
        title: data.title ?? null,
        caption: data.caption ?? null,
        media_url: data.mediaUrl ?? null,
        media_kind: data.mediaKind,
        title_ref: data.titleRef ?? null,
        season: data.season ?? null,
        episode: data.episode ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const PostId = z.object({ postId: z.string().uuid() });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => PostId.parse(v))
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("post_likes").delete().eq("post_id", data.postId).eq("user_id", context.userId);
      return { liked: false };
    }
    const { error } = await context.supabase.from("post_likes").insert({ post_id: data.postId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const listComments = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => PostId.parse(v))
  .handler(async ({ data }) => {
    const client = await publicClient();
    const { data: rows } = await client
      .from("post_comments")
      .select("id, post_id, user_id, body, created_at")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: true });
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const profiles = ids.length
      ? (await client.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)).data ?? []
      : [];
    const map: Record<string, (typeof profiles)[number]> = {};
    for (const p of profiles) map[p.id] = p;
    return (rows ?? []).map((r) => ({ ...r, author: map[r.user_id] ?? null }));
  });

const AddComment = z.object({ postId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });
export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => AddComment.parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("post_comments")
      .insert({ post_id: data.postId, user_id: context.userId, body: data.body })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getPost = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => PostId.parse(v))
  .handler(async ({ data }) => {
    const client = await publicClient();
    const { data: post, error } = await client
      .from("posts")
      .select("id, author_id, kind, title, caption, media_url, media_kind, title_ref, season, episode, created_at")
      .eq("id", data.postId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Post not found");
    const { data: author } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", post.author_id)
      .maybeSingle();
    return { ...post, author };
  });
