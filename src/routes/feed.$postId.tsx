import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { getPost, listComments, addComment, toggleLike } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Send, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/feed/$postId")({
  component: PostPage,
  head: ({ params }) => ({ meta: [{ title: `Post — SPOILED`, }, { name: "description", content: `A community post on SPOILED.` }, { property: "og:title", content: "SPOILED community post" }] }),
});

type Comment = { id: string; user_id: string; body: string; created_at: string; author: { username: string | null; display_name: string | null; avatar_url: string | null } | null };

function PostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const runPost = useServerFn(getPost);
  const runComments = useServerFn(listComments);
  const runAdd = useServerFn(addComment);
  const runLike = useServerFn(toggleLike);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [liked, setLiked] = useState(false);

  const refresh = () => {
    runPost({ data: { postId } }).then(setPost).catch(() => navigate({ to: "/feed" }));
    runComments({ data: { postId } }).then((r) => setComments(r as Comment[]));
  };

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", data.user.id).maybeSingle().then(({ data: row }) => setLiked(!!row));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) return navigate({ to: "/auth", search: { next: `/feed/${postId}` } });
    if (!body.trim()) return;
    await runAdd({ data: { postId, body: body.trim() } });
    setBody("");
    refresh();
  };

  const like = async () => {
    if (!signedIn) return navigate({ to: "/auth", search: { next: `/feed/${postId}` } });
    const res = await runLike({ data: { postId } });
    setLiked(res.liked);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  };

  if (!post) return (
    <div className="min-h-screen"><SiteHeader /><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></div>
  );

  const who = post.author?.username ?? post.author?.display_name ?? "someone";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link to="/feed" className="text-xs text-muted-foreground hover:text-foreground">← Feed</Link>
        <article className="mt-3 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold uppercase text-primary">{who.slice(0, 2)}</div>
            <div>
              <div className="text-sm font-semibold">@{who}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(post.created_at).toLocaleString()}</div>
            </div>
          </div>
          {post.title && <h1 className="mb-2 text-2xl font-bold">{post.title}</h1>}
          {post.title_ref && <div className="mb-2 text-xs text-muted-foreground">{post.title_ref}{post.season ? ` · S${post.season}` : ""}{post.episode ? ` E${post.episode}` : ""}</div>}
          {post.caption && <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>}
          {post.media_url && post.media_kind === "image" && <img src={post.media_url} className="mt-3 max-h-[520px] w-full rounded-lg object-cover" alt="" />}
          {post.media_url && post.media_kind === "video" && <video src={post.media_url} controls className="mt-3 max-h-[520px] w-full rounded-lg" />}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <button onClick={like} className={`inline-flex items-center gap-1.5 hover:text-foreground ${liked ? "text-primary" : ""}`}>
              <Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} /> Like
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 hover:text-foreground"><Share2 className="h-4 w-4" /> Share</button>
          </div>
        </article>

        <h2 className="mt-6 text-lg font-semibold">Comments ({comments.length})</h2>
        <form onSubmit={submit} className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card p-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={signedIn ? "Add a comment..." : "Sign in to comment"} className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:brightness-110"><Send className="h-4 w-4" /></button>
        </form>
        <div className="mt-4 space-y-3">
          {comments.map((c) => {
            const cw = c.author?.username ?? c.author?.display_name ?? "user";
            return (
              <div key={c.id} className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold uppercase text-primary">{cw.slice(0, 2)}</div>
                <div>
                  <div className="text-xs font-semibold">@{cw} <span className="text-muted-foreground font-normal">· {new Date(c.created_at).toLocaleString()}</span></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
