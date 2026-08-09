import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { salemChat } from "@/lib/salem.functions";
import { Loader2, Send, Sparkles, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/community/salem")({
  component: SalemPage,
  head: () => ({
    meta: [
      { title: "SALEM — the AI who watched everything | SPOILED" },
      { name: "description", content: "Talk to SALEM about any show, movie or theory. Flip the spoiler switch when you want the truth." },
      { property: "og:title", content: "SALEM — the AI who watched everything" },
      { property: "og:description", content: "Chat about shows, movies and theories. Spoilers optional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

const OPENERS = [
  "I just finished Silo season 3 — where am I in the books?",
  "Break down the Severance finale for me.",
  "Give me your wildest House of the Dragon theory.",
  "Continue The Last of Us story from the end of season 2.",
];

function SalemPage() {
  const run = useServerFn(salemChat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "okay hi — I'm SALEM. I've seen everything and I have opinions about most of it.\n\nTell me what you're watching, where you stopped, or just throw a theory at me. Spoilers are off by default, flip the switch up top when you want the real answers." },
  ]);
  const [input, setInput] = useState("");
  const [spoilers, setSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await run({ data: { messages: next.slice(-20).filter((m) => m.content), spoilers } });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (err) {
      toast.error((err as Error).message);
      setMessages(next);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">SALEM</h1>
              <p className="text-xs text-muted-foreground">The AI who watched everything</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/community" className="hidden text-xs text-muted-foreground hover:text-foreground sm:block">← Community</Link>
            <button
              onClick={() => setSpoilers((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                spoilers ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {spoilers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              Spoilers {spoilers ? "on" : "off"}
            </button>
          </div>
        </div>

        <div ref={boxRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> SALEM is thinking...
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {OPENERS.map((o) => (
              <button key={o} onClick={() => send(o)} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground">
                {o}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-card p-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Talk to SALEM..."
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-primary p-2.5 text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
