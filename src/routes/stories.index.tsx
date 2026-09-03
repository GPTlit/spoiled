import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/stories/")({
  component: StoriesPage,
  head: () => ({
    meta: [
      { title: "Published Stories — SPOILED" },
      { name: "description", content: "Read screenplays and novels written in the SPOILED Screen Writer studio and published by their authors." },
      { property: "og:title", content: "Published Stories — SPOILED" },
      { property: "og:description", content: "Screenplays and novels published by SPOILED writers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Row = { id: string; title: string; logline: string | null; genre: string | null; style: string | null; cover_url: string | null; updated_at: string };

function StoriesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sw_projects")
      .select("id, title, logline, genre, style, cover_url, updated_at")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Published stories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Anything a writer publishes from the Studio appears here instantly — no redeploy needed.</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            Nothing published yet.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {rows.map((r) => (
              <Link key={r.id} to="/stories/$id" params={{ id: r.id }} className="group rounded-xl border border-border bg-card p-3 transition hover:border-primary/60">
                <div className="mb-3 aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                  {r.cover_url ? (
                    <img src={r.cover_url} alt={`${r.title} cover`} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><BookOpen className="h-6 w-6" /></div>
                  )}
                </div>
                <div className="truncate text-sm font-semibold">{r.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.style || "Story"}{r.genre ? ` · ${r.genre}` : ""}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
