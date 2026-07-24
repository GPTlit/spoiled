import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listFeed, createPost, toggleLike } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";
import { Heart, MessageCircle, Share2, Image, Video, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Feed — SPOILED" },
      { name: "description", content: "Community posts, theories, and moments people are calling out." },
    ],
  }),
});

type Post = {
  id: string;
  author_id: string;
  kind: "post" | "theory";
  title: string | null;
  caption: string | null;
  media_url: string | null;
  media_kind: "none" | "image" | "video";
  title_ref: string | null;
  season: number | null;
  episode: number | null;
  created_at: string;
  author: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  like_count: number;
  comment_count: number;
};

function FeedPage() {
  const runList = useServerFn(listFeed);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const refresh = () => runList({ data: { kind: "all" } }).then((data) => { setPosts(data as Post[]); setLoading(false); });

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
          {signedIn ? (
            <button onClick={() => setShowComposer(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
              New post
            </button>
          ) : (
            <Link to="/auth" search={{ next: "/feed" }} className="rounded-full border border-border bg-card px-4 py-2 text-sm">Sign in to post</Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Nothing yet. Be the first to post something.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} p={p} signedIn={signedIn} onChange={refresh} />)}
          </div>
        )}
      </div>
      {showComposer && <Composer onClose={() => setShowComposer(false)} onCreated={() => { setShowComposer(false); refresh(); }} />}
    </div>
  );
}

export function PostCard({ p, signedIn, onChange }: { p: Post; signedIn: boolean; onChange?: () => void }) {
  const navigate = useNavigate();
  const runLike = useServerFn(toggleLike);
  const [likes, setLikes] = useState(p.like_count);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("post_likes").select("post_id").eq("post_id", p.id).eq("user_id", data.user.id).maybeSingle().then(({ data: row }) => setLiked(!!row));
    });
  }, [p.id, signedIn]);

  const like = async () => {
    if (!signedIn) return navigate({ to: "/auth", search: { next: "/feed" } });
    const res = await runLike({ data: { postId: p.id } });
    setLiked(res.liked);
    setLikes((n) => n + (res.liked ? 1 : -1));
  };

  const share = async () => {
    const url = `${window.location.origin}/feed/${p.id}`;
    if (navigator.share) {
      try { await navigator.share({ url, title: p.title ?? "SPOILED post" }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  };

  const who = p.author?.username ?? p.author?.display_name ?? "someone";

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold uppercase text-primary">
            {who.slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold">@{who}</div>
            <div className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
          </div>
        </div>
        {p.kind === "theory" && <span className="rounded-full bg-verdant/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-verdant">Theory</span>}
      </div>

      {p.title && <h3 className="mb-1 text-lg font-semibold leading-snug">{p.title}</h3>}
      {p.title_ref && (
        <div className="mb-2 text-xs text-muted-foreground">
          {p.title_ref}{p.season ? ` · S${p.season}` : ""}{p.episode ? ` E${p.episode}` : ""}
        </div>
      )}
      {p.caption && <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.caption}</p>}
      {p.media_url && p.media_kind === "image" && <img src={p.media_url} alt="" className="mt-3 max-h-[520px] w-full rounded-lg object-cover" />}
      {p.media_url && p.media_kind === "video" && <video src={p.media_url} controls className="mt-3 max-h-[520px] w-full rounded-lg" />}

      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <button onClick={like} className={`inline-flex items-center gap-1.5 hover:text-foreground ${liked ? "text-primary" : ""}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-primary" : ""}`} /> {likes}
        </button>
        <Link to="/feed/$postId" params={{ postId: p.id }} className="inline-flex items-center gap-1.5 hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> {p.comment_count}
        </Link>
        <button onClick={share} className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </article>
  );
}

function Composer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const runCreate = useServerFn(createPost);
  const [kind, setKind] = useState<"post" | "theory">("post");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [titleRef, setTitleRef] = useState("");
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let mediaUrl: string | undefined;
      let mediaKind: "none" | "image" | "video" = "none";
      if (file) {
        mediaKind = file.type.startsWith("video") ? "video" : "image";
        const { url } = await uploadMedia("feed-media", file, mediaKind);
        mediaUrl = url;
      }
      await runCreate({
        data: {
          kind,
          title: title || undefined,
          caption: caption || undefined,
          mediaUrl,
          mediaKind,
          titleRef: titleRef || undefined,
          season: season ? Number(season) : null,
          episode: episode ? Number(episode) : null,
        },
      });
      toast.success("Posted.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-2xl border border-border bg-popover p-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button type="button" onClick={() => setKind("post")} className={`rounded-full px-3 py-1 text-xs ${kind === "post" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>Post</button>
            <button type="button" onClick={() => setKind("theory")} className={`rounded-full px-3 py-1 text-xs ${kind === "theory" ? "bg-verdant/25 text-verdant" : "bg-card text-muted-foreground"}`}>Theory</button>
          </div>
          <button type="button" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {kind === "theory" && (
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Theory title" required className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
        )}
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder={kind === "theory" ? "Lay out your theory..." : "What did we miss?"} className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
        <div className="grid grid-cols-3 gap-2">
          <input value={titleRef} onChange={(e) => setTitleRef(e.target.value)} placeholder="Show / movie" className="col-span-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary sm:col-span-1" />
          <input value={season} onChange={(e) => setSeason(e.target.value)} inputMode="numeric" placeholder="Season" className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
          <input value={episode} onChange={(e) => setEpisode(e.target.value)} inputMode="numeric" placeholder="Episode" className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            <Image className="h-3.5 w-3.5" /> Photo
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            <Video className="h-3.5 w-3.5" /> Video
            <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
          {busy ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
