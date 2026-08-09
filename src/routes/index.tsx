import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { TRENDING } from "@/lib/catalog";
import { SERVICES } from "@/lib/services";
import { ArrowRight, MessageSquare, Search, Tv, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "SPOILED — Continue any story" },
      { name: "description", content: "Search where you stopped. Read theories. Talk with fans. Created by SPOILED SALEM." },
      { property: "og:title", content: "SPOILED" },
      { property: "og:description", content: "The adaptation companion. Continue any story from where you stopped." },
    ],
  }),
});

const EXAMPLES = [
  "Silo Season 3 Episode 10",
  "Solo Leveling Episode 12",
  "The Last of Us Season 2",
  "House of the Dragon Finale",
];

function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submit = (q: string) => {
    const v = q.trim();
    if (!v) return;
    navigate({ to: "/continue", search: { q: v } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="flex flex-col items-center text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              AI Adaptation Companion
            </span>
            <h1 className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              Continue any story
              <br />
              <span className="text-primary">from where you stopped.</span>
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Show, anime, movie, game — we map you to the exact point in the source material, then continue in the style you pick.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(query);
              }}
              className="mt-8 w-full max-w-2xl"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-cinema focus-within:border-primary/70">
                <Search className="ml-2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`e.g. ${EXAMPLES[0]}`}
                  className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => submit(e)}
                    className="rounded-full border border-border bg-card/40 px-3 py-1 text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/watch" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-primary/60">
                <Tv className="h-4 w-4 text-primary" /> Browse streaming
              </Link>
              <Link to="/community" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-primary/60">
                <Users className="h-4 w-4 text-primary" /> Join a group
              </Link>
              <Link to="/feed" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm hover:border-primary/60">
                <MessageSquare className="h-4 w-4 text-primary" /> Read the feed
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Streaming services */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by service</h2>
            <p className="text-sm text-muted-foreground">Pick a platform, tap any episode, get the AI breakdown.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              to="/watch/$service"
              params={{ service: s.slug }}
              className="group relative flex aspect-[16/10] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/60 hover:bg-card/80"
            >
              <ServiceTile service={s} />
              <div className="mt-3 text-xs font-medium text-muted-foreground group-hover:text-foreground">{s.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Trending stops</h2>
          <p className="text-sm text-muted-foreground">Where people are picking up.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRENDING.slice(0, 8).map((t) => (
            <button
              key={t.q}
              onClick={() => submit(t.q)}
              className="group rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t.tag}
                </span>
              </div>
              <div className="font-semibold leading-tight">{t.q}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.franchise}</div>
            </button>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div>© SPOILED — Created by SPOILED SALEM. Sourced from public material only.</div>
          <div className="flex gap-4">
            <Link to="/watch" className="hover:text-foreground">Watch</Link>
            <Link to="/community" className="hover:text-foreground">Community</Link>
            <Link to="/feed" className="hover:text-foreground">Feed</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ServiceTile({ service }: { service: { color: string; name: string; logo: string } }) {
  return (
    <div
      className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg"
      style={{ backgroundColor: service.color }}
    >
      <img src={service.logo} alt={`${service.name} logo`} loading="lazy" className="h-full w-auto object-contain" />
    </div>
  );
}

