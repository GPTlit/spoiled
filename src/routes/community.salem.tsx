import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Mic,
  Plus,
  Send,
  Square,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";
import { useI18n } from "@/lib/i18n";
import {
  deleteSalemConversation,
  getSalemConversation,
  listSalemConversations,
  salemSend,
  type SalemAttachment,
} from "@/lib/salem.functions";

export const Route = createFileRoute("/community/salem")({
  component: SalemPage,
  head: () => ({
    meta: [
      { title: "SALEM — the AI who watched everything | SPOILED" },
      {
        name: "description",
        content:
          "Talk to SALEM about any show, movie or theory. Send photos, videos and voice notes. Flip the spoiler switch when you want the truth.",
      },
      { property: "og:title", content: "SALEM — the AI who watched everything" },
      { property: "og:description", content: "Chat about shows, movies and theories. Spoilers optional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string; attachments?: SalemAttachment[] };
type Conv = { id: string; title: string; updated_at: string; expires_at: string };
type Pending = { url: string; kind: "image" | "video" | "audio"; name?: string };

const OPENERS = [
  "I just finished Silo season 3 — where am I in the books?",
  "Break down the Severance finale for me.",
  "What's actually releasing this month?",
  "Give me your wildest House of the Dragon theory.",
];

const GREETING: Msg = {
  role: "assistant",
  content:
    "okay hi — I'm SALEM. I've seen everything and I have opinions about most of it.\n\nSend me a thought, a photo, a clip, or just hold the mic and talk. I can look things up live too. Spoilers are off by default — flip the switch up top when you want the real answers.",
};

function SalemPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const send = useServerFn(salemSend);
  const loadList = useServerFn(listSalemConversations);
  const loadConv = useServerFn(getSalemConversation);
  const removeConv = useServerFn(deleteSalemConversation);

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [spoilers, setSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const refreshList = useCallback(async () => {
    try {
      const rows = await loadList({ data: {} as never });
      setConvs(rows as Conv[]);
    } catch {
      /* not signed in */
    }
  }, [loadList]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) void refreshList();
    });
  }, [refreshList]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const openConversation = async (id: string) => {
    setHistoryOpen(false);
    setActiveId(id);
    try {
      const rows = (await loadConv({ data: { id } })) as unknown as {
        role: "user" | "assistant";
        content: string;
        attachments: SalemAttachment[] | null;
      }[];
      setMessages(
        rows.length
          ? rows.map((r) => ({ role: r.role, content: r.content, attachments: r.attachments ?? [] }))
          : [GREETING],
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([GREETING]);
    setPending([]);
    setHistoryOpen(false);
    inputRef.current?.focus();
  };

  const attach = async (file: File) => {
    const kind: Pending["kind"] = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
    setUploading(true);
    try {
      const { url } = await uploadMedia("salem-media", file, kind);
      setPending((p) => [...p, { url, kind, name: file.name }]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setUploading(true);
        try {
          const { url } = await uploadMedia("salem-media", blob, "audio");
          setPending((p) => [...p, { url, kind: "audio", name: "Voice note" }]);
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone access was blocked.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !pending.length) || busy) return;
    if (!signedIn) {
      toast.error("Sign in to chat with SALEM.");
      void navigate({ to: "/auth" });
      return;
    }
    const attachments = pending;
    const optimistic: Msg[] = [...messages, { role: "user", content: trimmed, attachments: attachments as SalemAttachment[] }];
    setMessages(optimistic);
    setInput("");
    setPending([]);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setBusy(true);
    try {
      const res = await send({
        data: {
          conversationId: activeId,
          text: trimmed,
          attachments: attachments.map((a) => ({ url: a.url, kind: a.kind, name: a.name })),
          spoilers,
          lang: "en",
        },
      });
      setActiveId(res.conversationId);
      setMessages([...optimistic, { role: "assistant", content: res.reply }]);
      void refreshList();
    } catch (err) {
      toast.error((err as Error).message);
      setMessages(messages);
      setPending(attachments);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 py-2 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/community" })}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            S
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{t("salem.name")}</div>
            <div className="truncate text-[11px] text-muted-foreground">{t("salem.tagline")}</div>
          </div>
        </div>
        <button
          onClick={() => setSpoilers((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            spoilers ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          {spoilers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{spoilers ? t("salem.spoilersOn") : t("salem.spoilersOff")}</span>
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          className="rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground lg:hidden"
        >
          {t("salem.history")}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card/30 lg:flex">
          <HistoryPanel
            convs={convs}
            activeId={activeId}
            onOpen={openConversation}
            onNew={newChat}
            onDelete={async (id) => {
              await removeConv({ data: { id } });
              if (id === activeId) newChat();
              void refreshList();
            }}
          />
        </aside>

        {historyOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="w-72 max-w-[80%] bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">{t("salem.history")}</span>
                <button onClick={() => setHistoryOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <HistoryPanel
                convs={convs}
                activeId={activeId}
                onOpen={openConversation}
                onNew={newChat}
                onDelete={async (id) => {
                  await removeConv({ data: { id } });
                  if (id === activeId) newChat();
                  void refreshList();
                }}
              />
            </div>
            <div className="flex-1 bg-black/60" onClick={() => setHistoryOpen(false)} />
          </div>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={boxRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[88%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {!!m.attachments?.length && (
                      <div className="space-y-2">
                        {m.attachments.map((a, k) => (
                          <AttachmentView key={k} a={a} />
                        ))}
                      </div>
                    )}
                    {m.content && <p className="whitespace-pre-line">{m.content}</p>}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> {t("salem.thinking")}
                </div>
              )}
            </div>
          </div>

          {messages.length <= 1 && !busy && (
            <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-3 pb-2 sm:px-6">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  onClick={() => submit(o)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                >
                  {o}
                </button>
              ))}
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-card/60 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="mx-auto max-w-3xl">
              {!!pending.length && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pending.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px]">
                      {p.kind === "image" ? <ImageIcon className="h-3 w-3" /> : p.kind === "video" ? <VideoIcon className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      <span className="max-w-32 truncate">{p.name ?? p.kind}</span>
                      <button onClick={() => setPending((prev) => prev.filter((_, k) => k !== i))} aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit(input);
                }}
                className="flex items-end gap-1.5 rounded-2xl border border-border bg-card p-1.5"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void attach(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Attach"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => (recording ? stopRecording() : void startRecording())}
                  aria-label="Record voice"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    recording ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoGrow(e.target);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit(input);
                    }
                  }}
                  rows={1}
                  placeholder={t("salem.placeholder")}
                  className="max-h-40 min-h-9 flex-1 resize-none self-center bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  disabled={busy || (!input.trim() && !pending.length)}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AttachmentView({ a }: { a: SalemAttachment }) {
  if (a.kind === "image") return <img src={a.url} alt={a.name ?? "attachment"} className="max-h-64 rounded-xl object-cover" />;
  if (a.kind === "video") return <video src={a.url} controls className="max-h-64 rounded-xl" />;
  return (
    <div className="space-y-1">
      <audio src={a.url} controls className="w-56" />
      {a.transcript && <p className="text-xs italic opacity-80">“{a.transcript}”</p>}
    </div>
  );
}

function HistoryPanel({
  convs,
  activeId,
  onOpen,
  onNew,
  onDelete,
}: {
  convs: Conv[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          + {t("salem.newChat")}
        </button>
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{t("salem.history")}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {convs.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-xs transition ${
              c.id === activeId ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-card"
            }`}
          >
            <button onClick={() => onOpen(c.id)} className="min-w-0 flex-1 truncate text-start">
              {c.title}
            </button>
            <button onClick={() => onDelete(c.id)} aria-label="Delete" className="opacity-0 transition group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!convs.length && <p className="px-2 text-xs text-muted-foreground">Nothing yet — chats stay here for 48 hours.</p>}
      </div>
    </div>
  );
}
