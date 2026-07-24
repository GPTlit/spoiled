import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import {
  getGroup,
  isMember,
  joinGroup,
  leaveGroup,
  listMessages,
  sendMessage,
} from "@/lib/community.functions";
import { uploadMedia } from "@/lib/media-upload";
import { Image, Mic, Send, Smile, StopCircle, Video, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/community/$slug")({
  component: GroupChatPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — SPOILED community` },
      { name: "description", content: "Live group chat for fans." },
    ],
  }),
});

const STICKERS = ["🔥","💀","👀","🤯","😭","😂","🍿","🙌","❤️","✨","🧠","🕵️","🐉","🗡️","👽","🚨","🎬","📖","🤔","💡","💯","🏆","😱","🫡"];

type Msg = {
  id: string;
  group_id: string;
  user_id: string;
  kind: "text" | "image" | "video" | "voice" | "sticker";
  content: string | null;
  media_url: string | null;
  duration_ms: number | null;
  created_at: string;
  author?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

function GroupChatPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const runGroup = useServerFn(getGroup);
  const runMember = useServerFn(isMember);
  const runJoin = useServerFn(joinGroup);
  const runLeave = useServerFn(leaveGroup);
  const runMessages = useServerFn(listMessages);
  const runSend = useServerFn(sendMessage);

  const [group, setGroup] = useState<{ id: string; name: string; topic: string | null; member_count: number } | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [member, setMember] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState<null | "image" | "video">(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setMeId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    runGroup({ data: { slug } })
      .then(async (g) => {
        setGroup(g);
        if (signedIn) {
          const m = await runMember({ data: { groupId: g.id } });
          setMember(m.member);
          if (m.member) {
            const msgs = (await runMessages({ data: { groupId: g.id } })) as Msg[];
            setMessages(msgs);
          }
        }
      })
      .catch((err) => toast.error((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, signedIn]);

  // Realtime subscription
  useEffect(() => {
    if (!group?.id || !member) return;
    const channel = supabase
      .channel(`group-${group.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${group.id}` },
        async (payload) => {
          const m = payload.new as Msg;
          // fetch author profile
          const { data: p } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", m.user_id).maybeSingle();
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, { ...m, author: p ?? null }]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [group?.id, member]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const doJoin = async () => {
    if (!group) return;
    if (!signedIn) return navigate({ to: "/auth", search: { next: `/community/${slug}` } });
    await runJoin({ data: { groupId: group.id } });
    setMember(true);
    const msgs = (await runMessages({ data: { groupId: group.id } })) as Msg[];
    setMessages(msgs);
  };

  const doLeave = async () => {
    if (!group) return;
    await runLeave({ data: { groupId: group.id } });
    setMember(false);
    setMessages([]);
  };

  const sendText = async () => {
    if (!group || !text.trim()) return;
    const t = text.trim();
    setText("");
    await runSend({ data: { groupId: group.id, kind: "text", content: t } });
  };

  const sendSticker = async (s: string) => {
    if (!group) return;
    setShowStickers(false);
    await runSend({ data: { groupId: group.id, kind: "sticker", content: s } });
  };

  const sendFile = async (file: File, kind: "image" | "video") => {
    if (!group) return;
    setUploading(kind);
    try {
      const { url } = await uploadMedia("chat-media", file, kind);
      await runSend({ data: { groupId: group.id, kind, mediaUrl: url } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <Link to="/community" className="text-xs text-muted-foreground hover:text-foreground">← Community</Link>
            <h1 className="mt-1 text-2xl font-bold">{group.name}</h1>
            {group.topic && <p className="mt-1 text-sm text-muted-foreground">{group.topic}</p>}
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {group.member_count} members</div>
          </div>
          {member ? (
            <button onClick={doLeave} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/60">Leave</button>
          ) : (
            <button onClick={doJoin} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
              {signedIn ? "Join" : "Sign in to join"}
            </button>
          )}
        </div>

        {!member ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Join the group to see the conversation.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-background">
              <div className="h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && <div className="text-center text-xs text-muted-foreground">Say hi 👋</div>}
                {messages.map((m) => (
                  <Message key={m.id} m={m} mine={m.user_id === meId} />
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border p-2">
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground">
                    <Image className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0], "image")}
                    />
                  </label>
                  <label className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground">
                    <Video className="h-4 w-4" />
                    <input
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0], "video")}
                    />
                  </label>
                  <VoiceButton onSent={async (blob, duration) => {
                    setUploading("image");
                    try {
                      const { url } = await uploadMedia("chat-media", blob, "audio", "webm");
                      await runSend({ data: { groupId: group.id, kind: "voice", mediaUrl: url, durationMs: duration } });
                    } catch (err) {
                      toast.error((err as Error).message);
                    } finally {
                      setUploading(null);
                    }
                  }} />
                  <button onClick={() => setShowStickers((v) => !v)} className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground">
                    <Smile className="h-4 w-4" />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendText())}
                    placeholder="Message..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={sendText}
                    disabled={!text.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:brightness-110 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {uploading && (
                  <div className="mt-1 flex items-center gap-2 px-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploading}...
                  </div>
                )}
                {showStickers && (
                  <div className="mt-2 grid grid-cols-12 gap-1 rounded-lg border border-border bg-card p-2">
                    {STICKERS.map((s) => (
                      <button key={s} onClick={() => sendSticker(s)} className="rounded p-2 text-2xl hover:bg-background">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Message({ m, mine }: { m: Msg; mine: boolean }) {
  const who = m.author?.username ?? m.author?.display_name ?? "user";
  return (
    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold uppercase text-primary">
          {who.slice(0, 2)}
        </div>
      )}
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card"}`}>
        {!mine && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">@{who}</div>}
        {m.kind === "text" && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
        {m.kind === "sticker" && <div className="text-5xl leading-none">{m.content}</div>}
        {m.kind === "image" && m.media_url && <img src={m.media_url} alt="" className="max-h-72 rounded-lg" />}
        {m.kind === "video" && m.media_url && <video src={m.media_url} controls className="max-h-72 rounded-lg" />}
        {m.kind === "voice" && m.media_url && <audio src={m.media_url} controls className="w-64" />}
      </div>
    </div>
  );
}

function VoiceButton({ onSent }: { onSent: (blob: Blob, duration: number) => void }) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const startRef = useRef(0);
  const chunksRef = useRef<BlobPart[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = Date.now() - startRef.current;
        stream.getTracks().forEach((t) => t.stop());
        onSent(blob, duration);
      };
      rec.start();
      recRef.current = rec;
      startRef.current = Date.now();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  return (
    <button
      onClick={recording ? stop : start}
      className={`rounded-lg p-2 ${recording ? "bg-primary text-primary-foreground animate-pulse" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
      title={recording ? "Stop" : "Voice message"}
    >
      {recording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
