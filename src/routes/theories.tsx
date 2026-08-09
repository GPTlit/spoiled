import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listTheories, type TheoryRow } from "@/lib/theories.functions";
import { Loader2, Lightbulb, Search } from "lucide-react";

export const Route = createFileRoute("/theories")({
  component: TheoriesPage,
  head: () => ({
    meta: [
      { title: "Theories — SPOILED" },
      { name: "description", content: "Fan theories for the 20 most-talked-about shows right now — clues, foreshadowing and where each one is heading." },
      { property: "og:title", content: "Theories — SPOILED" },
      { property: "og:description", content: "Curated theories for the biggest shows on TV right now." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Show = {
  slug: string;
  title: string;
  poster: string | null;
  summary: string | null;
  theories: TheoryRow[];
};

function TheoriesPage() {
  const run = useServerFn(listTheories);
  const [rows, setRows] = useState<TheoryRow[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    run().then((d) => setRows(d as TheoryRow[])).catch(() => setRows([]));
  }, [run]);

  const shows: Show[] = useMemo(() => {
    const map = new Map<string, Show>();
    for (const r of rows ?? []) {
      let s = map.get(r.show_slug);
      if (!s) {
        s = { slug: r.show_slug, title: r.show_title, poster: r.poster_url, summary: r.show_summary, theories: [] };
        map.set(r.show_slug, s);
      }
      s.theories.push(r);
    }
    const list = [...map.values()];
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((s) => s.title.toLowerCase().includes(needle)) : list;
  }, [rows, q]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Theories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The 20 shows everyone is arguing about, and the theories worth arguing over. Tap a show to read them.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <Search className="ml-2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a show..."
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {rows === null ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : shows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            No theories yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shows.map((s) => (
              <button
                key={s.slug}
                onClick={() => setOpen(s.slug)}
                className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary/60"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-background">
                  {s.poster ? (
                    <img src={s.poster} alt={`${s.title} poster`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Lightbulb className="h-8 w-8" /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <div className="text-sm font-semibold text-white">{s.title}</div>
                    <div className="text-[11px] text-white/70">{s.theories.length} theories</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <TheoryModal show={shows.find((s) => s.slug === open) ?? null} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function TheoryModal({ show, onClose }: { show: Show | null; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-2xl border border-border bg-popover p-5">
        <div className="flex gap-4">
          {show.poster && <img src={show.poster} alt={`${show.title} poster`} className="h-36 w-24 rounded-lg object-cover" />}
          <div>
            <h2 className="text-xl font-bold">{show.title}</h2>
            {show.summary && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{show.summary}</p>}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {show.theories.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-semibold leading-tight">{t.title}</div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm hover:border-primary/60">Close</button>
      </div>
    </div>
  );
}
