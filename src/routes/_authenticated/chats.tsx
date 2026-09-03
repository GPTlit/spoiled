import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listConversations, togglePin, searchPeople, openThread, getThread, sendDm, type Conversation } from "@/lib/chats.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";
import { ArrowLeft, ImagePlus, Loader2, Pin, PinOff, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsPage,
  head: () => ({
    meta: [
      { title: "Chats — SPOILED" },
      { name: "description", content: "Your direct messages and group conversations, newest on top, with pinned chats kept at the very top." },
      { property: "og:title", content: "Chats — SPOILED" },
      { property: "og:description", content: "Direct messages and group chats on SPOILED." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Msg = { id: string; sender_id: string; kind: string; content: string | null; media_url: string | null; created_at: string };

function ChatsPage() {
  const runList = useServerFn(listConversations);
  const runPin = useServerFn(togglePin);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDm, setOpenDm] = useState<string | null>(null);
  const [newChat, setNewChat] = useState(false);

  const refresh = () => runList().then((d) => { setConvos(d as Conversation[]); setLoading(false); });
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const pin = async (c: Conversation) => {
    setConvos((prev) => prev.map((x) => (x.key === c.key ? { ...x, pinned: !x.pinned } : x)));
    await runPin({ data: { kind: c.kind, refId: c.refId, pinned: !c.pinned } });
    refresh();
  };

  if (openDm) return <DmView threadId={openDm} onBack={() => { setOpenDm(null); refresh(); }} />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
            <p className="mt-1 text-sm text-muted-foreground">Newest conversation on top. Pin the ones that matter.</p>
          </div>
          <button onClick={() => setNewChat(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
            New chat
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : convos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            No conversations yet. Start a DM or join a group in the Community.
          </div>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card">
            {convos.map((c) => (
              <li key={c.key} className="flex items-center gap-3 px-4 py-3 hover:bg-card/60">
                <Avatar url={c.avatarUrl} name={c.name} group={c.kind === "group"} />
                <button
                  onClick={() => { if (c.kind === "dm") setOpenDm(c.refId); }}
                  className="min-w-0 flex-1 text-left"
                >
                  {c.kind === "group" ? (
                    <Link to="/community/$slug" params={{ slug: c.refId }} className="block min-w-0">
                      <Row c={c} />
                    </Link>
                  ) : (
                    <Row c={c} />
                  )}
                </button>
                <button onClick={() => pin(c)} aria-label={c.pinned ? "Unpin" : "Pin"} className="rounded-full p-2 text-muted-foreground hover:text-foreground">
                  {c.pinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {newChat && <NewChatModal onClose={() => setNewChat(false)} onOpen={(id) => { setNewChat(false); setOpenDm(id); }} />}
    </div>
  );
}

function Row({ c }: { c: Conversation }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold">{c.name}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.lastAt).toLocaleDateString()}</span>
      </div>
      <div className="truncate text-xs text-muted-foreground">{c.lastMessage}</div>
    </>
  );
}

function Avatar({ url, name, group }: { url: string | null; name: string; group?: boolean }) {
  if (url) return <img src={url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
      {group ? <Users className="h-5 w-5" /> : <span className="text-sm font-bold">{name.slice(0, 1).toUpperCase()}</span>}
    </div>
  );
}

function NewChatModal({ onClose, onOpen }: { onClose: () => void; onOpen: (threadId: string) => void }) {
  const runSearch = useServerFn(searchPeople);
  const runOpen = useServerFn(openThread);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => { runSearch({ data: { q } }).then((r) => setRows(r as never)); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people by username" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                onClick={async () => {
                  try {
                    const res = await runOpen({ data: { otherId: r.id } });
                    onOpen(res.id);
                  } catch (e) { toast.error((e as Error).message); }
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card/60"
              >
                <Avatar url={r.avatar_url} name={r.display_name || r.username || "?"} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.display_name || r.username}</div>
                  {r.username && <div className="truncate text-xs text-muted-foreground">@{r.username}</div>}
                </div>
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No one found.</li>}
        </ul>
      </div>
    </div>
  );
}

function DmView({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const runGet = useServerFn(getThread);
  const runSend = useServerFn(sendDm);
  const [other, setOther] = useState<{ username: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = () => runGet({ data: { threadId } }).then((r) => {
    setOther((r.other as never) ?? null);
    setMessages(r.messages as Msg[]);
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (payload: { kind: "text" | "image"; content?: string; mediaUrl?: string }) => {
    setBusy(true);
    try {
      await runSend({ data: { threadId, ...payload } });
      setText("");
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border/60 px-3 py-2">
        <button onClick={onBack} aria-label="Back" className="rounded-full p-2 hover:bg-card"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar url={other?.avatar_url ?? null} name={other?.display_name || other?.username || "?"} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{other?.display_name || other?.username || "Conversation"}</div>
          {other?.username && <div className="truncate text-[11px] text-muted-foreground">@{other.username}</div>}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.kind === "image" && m.media_url && <img src={m.media_url} alt="" className="mb-1 max-h-72 rounded-lg object-cover" />}
                {m.kind === "video" && m.media_url && <video src={m.media_url} controls className="mb-1 max-h-72 rounded-lg" />}
                {m.kind === "voice" && m.media_url && <audio src={m.media_url} controls className="mb-1" />}
                {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ kind: "text", content: text.trim() }); }}
        className="flex items-center gap-2 border-t border-border/60 px-3 py-2"
      >
        <label className="cursor-pointer rounded-full p-2 text-muted-foreground hover:text-foreground" aria-label="Send photo">
          <ImagePlus className="h-5 w-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const { url } = await uploadMedia("chat-media", f, "image");
                await send({ kind: "image", mediaUrl: url });
              } catch (err) { toast.error((err as Error).message); }
            }}
          />
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message"
          className="flex-1 rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-50" aria-label="Send">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
