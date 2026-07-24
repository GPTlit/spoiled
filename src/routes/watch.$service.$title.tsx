import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { findService } from "@/lib/services";
import { getTitleInfo, type TitleInfo } from "@/lib/watch.functions";
import { Loader2 } from "lucide-react";

const search = z.object({ q: z.string().catch("") });

export const Route = createFileRoute("/watch/$service/$title")({
  validateSearch: (s) => search.parse(s),
  component: TitlePage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.title} — SPOILED` },
      { name: "description", content: `AI-powered breakdown on ${params.service}.` },
    ],
  }),
});

function TitlePage() {
  const { service, title } = Route.useParams();
  const { q } = Route.useSearch();
  const s = findService(service);
  const run = useServerFn(getTitleInfo);
  const [info, setInfo] = useState<TitleInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setInfo(null);
    setErr(null);
    run({ data: { service, title: q || title } }).then((r) => setInfo(r as TitleInfo)).catch((e) => setErr((e as Error).message));
  }, [service, title, q, run]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link to="/watch/$service" params={{ service }} className="text-xs text-muted-foreground hover:text-foreground">← {s?.name}</Link>
        {!info && !err && (
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> The AI is looking this up...</div>
        )}
        {err && <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">{err}</div>}
        {info && (
          <>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s?.name} · {info.kind}</div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{info.title}{info.year ? ` (${info.year})` : ""}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{info.synopsis}</p>
              <div className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Source: </span>{info.source_material}</div>
            </div>
            <h2 className="mt-8 text-lg font-semibold">Episodes</h2>
            <div className="mt-3 space-y-6">
              {info.seasons.map((season) => (
                <div key={season.number}>
                  <div className="mb-2 text-sm font-semibold">Season {season.number}{season.year ? ` · ${season.year}` : ""}</div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                    {Array.from({ length: Math.min(season.episodes, 50) }).map((_, i) => {
                      const ep = i + 1;
                      return (
                        <Link
                          key={ep}
                          to="/watch/$service/$title/$season/$episode"
                          params={{ service, title, season: String(season.number), episode: String(ep) }}
                          search={{ q: info.title }}
                          className="flex aspect-square items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold transition hover:border-primary/60 hover:text-primary"
                        >
                          E{ep}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
