import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { TRENDING, UNIVERSES } from "@/lib/catalog";
import { Flame, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — THE SPOILED SALEM" },
      { name: "description", content: "Trending stops, curated adaptations, and where the fandom is right now." },
      { property: "og:title", content: "Discover — THE SPOILED SALEM" },
      { property: "og:description", content: "Trending stops and curated adaptations." },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const navigate = useNavigate();
  const go = (q: string) => navigate({ to: "/continue", search: { q } });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Discover</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Where the fandom is stopping — and what to pick up next.
        </p>

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <Flame className="h-3 w-3 text-primary" /> On fire
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRENDING.map((t) => (
              <button
                key={t.q}
                onClick={() => go(t.q)}
                className="group overflow-hidden rounded-2xl border border-border bg-card/50 p-5 text-left transition hover:border-primary/60"
              >
                <div className="text-[10px] uppercase tracking-widest text-primary">{t.tag}</div>
                <div className="mt-2 font-display text-2xl leading-tight">{t.q}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.franchise}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-blush" /> Rising universes
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {UNIVERSES.slice(0, 16).map((u) => (
              <button
                key={u}
                onClick={() => go(u)}
                className="rounded-xl border border-border bg-card/40 p-4 text-left text-sm transition hover:border-primary/60"
              >
                {u}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
