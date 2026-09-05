import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listBooks, getBook, deleteBook, startBook, writeBookChunk, finishBook, BOOK_STYLES } from "@/lib/books.functions";
import { SERVICE_TITLES } from "@/lib/services";
import { exportPdf, paginate } from "@/lib/pdf";
import { BookOpen, Loader2, Download, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/books")({
  component: BooksPage,
  head: () => ({
    meta: [
      { title: "Show to Book — SPOILED" },
      { name: "description", content: "Turn any series into a full book — cinematic, screenplay, novel or noir — and download it as a PDF." },
      { property: "og:title", content: "Show to Book — SPOILED" },
      { property: "og:description", content: "Turn any series into a complete book, season by season." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type BookRow = { id: string; show_title: string; style: string; cover_url: string | null; created_at: string };

const ALL_TITLES = Object.values(SERVICE_TITLES).flat();

function BooksPage() {
  const runList = useServerFn(listBooks);
  const runGet = useServerFn(getBook);
  const runDelete = useServerFn(deleteBook);
  const runStart = useServerFn(startBook);
  const runChunk = useServerFn(writeBookChunk);
  const runFinish = useServerFn(finishBook);

  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState<{ show_title: string; content: string; cover_url: string | null; credits: string } | null>(null);
  const [form, setForm] = useState({ showTitle: "", style: "Cinematic", seasonFrom: 1, seasonTo: 5, pages: 40, language: "en" });

  const poster = useMemo(
    () => ALL_TITLES.find((t) => t.title.toLowerCase() === form.showTitle.trim().toLowerCase())?.poster ?? null,
    [form.showTitle],
  );

  const refresh = () => runList().then((d) => { setBooks(d as BookRow[]); setLoading(false); });
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const generate = async () => {
    if (!form.showTitle.trim()) return toast.error("Pick a show first.");
    setBusy(true);
    const input = { ...form, coverUrl: poster };
    try {
      const { id, chunks } = await runStart({ data: input });
      setProgress({ done: 0, total: chunks });
      toast.info(`Writing ${form.pages} pages — this runs in ${chunks} passes.`);
      for (let i = 0; i < chunks; i++) {
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          try {
            await runChunk({ data: { ...input, id, index: i, chunks } });
            ok = true;
          } catch (err) {
            if (attempt === 1) throw err;
          }
        }
        setProgress({ done: i + 1, total: chunks });
      }
      await runFinish({ data: { id, showTitle: form.showTitle } });
      toast.success("Your book is ready");
      refresh();
    } catch (e) {
      toast.error((e as Error).message || "The book stopped early — open it to read what was written.");
      refresh();
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const read = async (id: string) => {
    try {
      const row = (await runGet({ data: { id } })) as typeof open;
      setOpen(row);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (open) {
    const pages = paginate(open.content);
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center gap-3">
            <button onClick={() => setOpen(null)} aria-label="Back" className="rounded-full border border-border p-2"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="flex-1 truncate text-xl font-bold">{open.show_title}</h1>
            <button
              onClick={() => exportPdf({ title: open.show_title, subtitle: `SPOILED · adapted from the series`, coverUrl: open.cover_url, pages: pages.map((c) => ({ content: c })) })}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            ><Download className="h-4 w-4" /> PDF</button>
          </div>
          {open.cover_url && <img src={open.cover_url} alt={`${open.show_title} cover`} className="mb-6 max-h-96 w-full rounded-2xl object-contain" />}
          <div className="space-y-8">
            {pages.map((p, i) => (
              <article key={i} className="rounded-2xl border border-border/60 bg-card/40 p-6">
                <pre className="whitespace-pre-wrap font-serif text-[15px] leading-8">{p}</pre>
                <div className="mt-4 text-center text-xs text-muted-foreground">{i + 1}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Show to Book</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every episode, written out in the style you choose. Cover from the show, credits to its creator.</p>

        <div className="mt-6 grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 sm:grid-cols-5">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Show</span>
            <input list="show-list" value={form.showTitle} onChange={(e) => setForm({ ...form, showTitle: e.target.value })} placeholder="Silo" className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary" />
            <datalist id="show-list">{ALL_TITLES.map((t) => <option key={t.title} value={t.title} />)}</datalist>
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Style</span>
            <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none">
              {BOOK_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">From S</span>
              <input type="number" min={1} max={50} value={form.seasonFrom} onChange={(e) => setForm({ ...form, seasonFrom: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none" />
            </label>
            <label>
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">To S</span>
              <input type="number" min={1} max={50} value={form.seasonTo} onChange={(e) => setForm({ ...form, seasonTo: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none" />
            </label>
          </div>
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Pages</span>
            <input type="number" min={2} max={400} step={5} value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none" />
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Language</span>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none">
              <option value="en">English</option><option value="ar">العربية</option><option value="fr">Français</option>
            </select>
          </label>
          <div className="sm:col-span-5 flex flex-wrap items-center gap-3">
            <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Write the book
            </button>
            {progress && (
              <span className="text-xs text-muted-foreground">
                Pass {progress.done} of {progress.total} · about {Math.min(form.pages, progress.done * 5)} of {form.pages} pages written
              </span>
            )}
          </div>
        </div>

        <h2 className="mb-3 mt-10 text-lg font-semibold">Your library</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-7 w-7 text-primary" /> No books yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((b) => (
              <div key={b.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50">
                <button onClick={() => read(b.id)} className="block w-full text-start">
                  <div className="aspect-[2/3] w-full bg-muted">
                    {b.cover_url ? <img src={b.cover_url} alt={`${b.show_title} cover`} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-7 w-7 text-muted-foreground" /></div>}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-semibold">{b.show_title}</div>
                    <div className="text-[11px] text-muted-foreground">{b.style}</div>
                  </div>
                </button>
                <button
                  aria-label="Delete book"
                  onClick={async () => { if (!confirm("Delete this book?")) return; await runDelete({ data: { id: b.id } }); setBooks((p) => p.filter((x) => x.id !== b.id)); }}
                  className="absolute end-2 top-2 rounded-full bg-background/80 p-1.5 opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                ><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
