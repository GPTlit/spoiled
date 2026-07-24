import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { getEpisodeAnalysis, type EpisodeAnalysis } from "@/lib/watch.functions";
import { nerdBreakdown } from "@/lib/nerd.functions";
import { AlertTriangle, EyeOff, Loader2, MessageCircleMore } from "lucide-react";

const search = z.object({ q: z.string().catch("") });

export const Route = createFileRoute("/watch/$service/$title/$season/$episode")({
  validateSearch: (s) => search.parse(s),
  component: EpisodePage,
  head: ({ params, search }) => ({
    meta: [
      { title: `${search.q || params.title} S${params.season}E${params.episode} — SPOILED` },
      { name: "description", content: `AI recap, clues, and source-material breakdown for episode ${params.episode}.` },
    ],
  }),
});

function EpisodePage() {
  const { service, title, season, episode } = Route.useParams();
  const { q } = Route.useSearch();
  const runEp = useServerFn(getEpisodeAnalysis);
  const runNerd = useServerFn(nerdBreakdown);
  const [analysis, setAnalysis] = useState<EpisodeAnalysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [nerd, setNerd] = useState<string | null>(null);
  const [nerdBusy, setNerdBusy] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setErr(null);
    setNerd(null);
    runEp({
      data: { service, title: q || title, season: Number(season), episode: Number(episode), released: true },
    })
      .then((r) => setAnalysis(r as EpisodeAnalysis))
      .catch((e) => setErr((e as Error).message));
  }, [service, title, season, episode, q, runEp]);

  const askNerd = async () => {
    setNerdBusy(true);
    try {
      const res = await runNerd({ data: { topic: `${q || title} Season ${season} Episode ${episode}` } });
      setNerd(res.content);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setNerdBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link to="/watch/$service/$title" params={{ service, title }} search={{ q: q || "" }} className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to {q || title}
        </Link>
        <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Season {season} · Episode {episode}</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{q || title}</h1>

        {!analysis && !err && (
          <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Analyzing the episode...</div>
        )}
        {err && <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">{err}</div>}

        {analysis && (
          <div className="mt-6 space-y-6">
            {!analysis.released && (
              <div className="flex items-start gap-2 rounded-xl border border-verdant/30 bg-verdant/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-verdant" />
                <div>
                  <div className="font-semibold text-verdant">Not released yet</div>
                  <div className="text-muted-foreground">Predictions below come strictly from the published source material.</div>
                </div>
              </div>
            )}

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Episode title</div>
              <h2 className="text-xl font-semibold">{analysis.episode_title || "—"}</h2>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Recap</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{analysis.recap}</p>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Clues & callbacks</div>
              <ul className="space-y-2 text-sm">
                {analysis.clues.map((c, i) => (
                  <li key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{c}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Book / source</div>
              <p className="text-sm leading-relaxed">{analysis.book_source}</p>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Adaptation differences</div>
              <p className="text-sm leading-relaxed">{analysis.differences}</p>
            </section>

            <section className="rounded-xl border border-primary/40 bg-primary/5 p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-primary">
                  {analysis.released ? "What happens next" : "Predictions from the source"}
                </div>
                <button onClick={() => setShowSpoilers((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary">
                  <EyeOff className="h-3 w-3" /> {showSpoilers ? "Hide" : "Reveal"}
                </button>
              </div>
              {showSpoilers ? (
                <p className="text-sm leading-relaxed">{analysis.predictions || analysis.spoilers_next}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Tap Reveal to spoil.</p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ask the nerd friend</div>
                <button onClick={askNerd} disabled={nerdBusy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
                  {nerdBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircleMore className="h-3 w-3" />} Break it down
                </button>
              </div>
              {nerd && <p className="whitespace-pre-wrap text-sm leading-relaxed">{nerd}</p>}
              {!nerd && <p className="text-xs italic text-muted-foreground">Your friend the nerd will tell you what actually mattered in this episode.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
