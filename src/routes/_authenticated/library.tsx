import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { listContinuations, deleteContinuation, toggleBookmark } from "@/lib/library.functions";
import type { SourceMapping } from "@/lib/ai.functions";
import { Bookmark, BookmarkX, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

type Row = {
  id: string;
  query: string;
  mapping: SourceMapping;
  mode: string;
  spoiler_level: number;
  content: string;
  is_bookmarked: boolean;
  created_at: string;
};

function LibraryPage() {
  const load = useServerFn(listContinuations);
  const del = useServerFn(deleteContinuation);
  const toggle = useServerFn(toggleBookmark);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    load().then((r) => setRows(r as unknown as Row[]));
  }, [load]);

  const onDelete = async (id: string) => {
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    try { await del({ data: { id } }); } catch (e) { toast.error((e as Error).message); }
  };
  const onToggle = async (id: string, next: boolean) => {
    setRows((r) => r?.map((x) => (x.id === id ? { ...x, is_bookmarked: next } : x)) ?? null);
    try { await toggle({ data: { id, bookmark: next } }); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Your Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved continuations, bookmarks, and history.
        </p>

        {!rows && (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center">
            <div className="font-display text-2xl">Nothing saved yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue a story and hit “Save to Library”.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Find where you stopped
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {rows?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} · {r.mode} · L{r.spoiler_level}
                  </div>
                  <div className="mt-1 truncate font-display text-xl">{r.query}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    → {r.mapping?.source?.title} · {r.mapping?.location?.chapter_or_section}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => onToggle(r.id, !r.is_bookmarked)}
                    className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle bookmark"
                  >
                    {r.is_bookmarked ? (
                      <Bookmark className="h-3.5 w-3.5 fill-primary text-primary" />
                    ) : (
                      <BookmarkX className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setOpenId((o) => (o === r.id ? null : r.id))}
                className="mt-3 text-xs text-primary hover:underline"
              >
                {openId === r.id ? "Hide" : "Read"}
              </button>
              {openId === r.id && (
                <article className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background/40 p-4 text-sm leading-relaxed">
                  {r.content}
                </article>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
