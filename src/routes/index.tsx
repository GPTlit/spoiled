import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { TRENDING, UNIVERSES } from "@/lib/catalog";
import { ArrowRight, Compass, Film, Search, Sparkles, Sprout, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const EXAMPLES = [
  "Silo Season 3 Episode 10",
  "Solo Leveling Episode 12",
  "The Last of Us Season 2",
  "Harry Potter Movie 4",
  "One Piece Episode 1135",
];

function Home() {
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
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
      <section className="relative overflow-hidden hero-gradient">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
              AI Adaptation Companion
            </span>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
              Continue any story
              <br />
              <span className="italic text-blush">from where you stopped.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Finished a show, movie, anime, or game? We map you to the exact point in the
              original source material — then continue in the style you choose.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(query);
              }}
              className="mt-10 w-full max-w-3xl"
            >
              <div className="group relative flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-2 shadow-cinema backdrop-blur-xl transition focus-within:border-primary/70 focus-within:shadow-glow">
                <Search className="ml-3 h-5 w-5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setPlaceholderIdx((i) => (i + 1) % EXAMPLES.length)}
                  placeholder={`What did you just finish?  e.g. ${EXAMPLES[placeholderIdx]}`}
                  className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/70 sm:text-lg"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 sm:px-5"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => submit(e)}
                    className="rounded-full border border-border/70 bg-card/40 px-3 py-1 transition hover:border-primary/60 hover:text-foreground"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* subtle bottom fade divider */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Trending stops</h2>
            <p className="text-sm text-muted-foreground">Where readers and viewers are picking up.</p>
          </div>
          <span className="hidden text-xs uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            live
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRENDING.map((t, i) => (
            <button
              key={t.q}
              onClick={() => submit(t.q)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 text-left transition hover:border-primary/60 hover:bg-card"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  {t.tag}
                </span>
              </div>
              <div className="font-display text-xl leading-tight">{t.q}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.franchise}</div>
              <div className="mt-6 flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                Continue <ArrowRight className="h-3 w-3" />
              </div>
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/25" />
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Search where you stopped",
              body: "Any episode, chapter, movie, or level. We understand the query.",
            },
            {
              icon: Compass,
              title: "AI maps you to the source",
              body: "Season 3 Ep 10 → Book 2 Chapter 22, with a confidence score.",
            },
            {
              icon: Wand2,
              title: "Continue in your style",
              body: "Screenplay, novel, POV, cinematic, horror — you pick.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card/40 p-6">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="font-display text-xl">{s.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Universes */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Supported universes</h2>
            <p className="text-sm text-muted-foreground">
              Thousands more beyond these — try anything with a source.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-xs text-verdant sm:inline-flex">
            <Sprout className="h-3 w-3" /> growing daily
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {UNIVERSES.map((u) => (
            <button
              key={u}
              onClick={() => submit(u)}
              className="rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              {u}
            </button>
          ))}
        </div>
      </section>

      {/* Feature preview strip */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { icon: Film, k: "Timeline Explorer", v: "Jump anywhere in the chronology." },
            { icon: Sparkles, k: "Evidence Mode", v: "Every claim cites its source." },
            { icon: Wand2, k: "Director Mode", v: "Rewrite futures in any style." },
            { icon: Compass, k: "Clue Detection", v: "Frames, symbols, soundtrack hints." },
          ].map((f) => (
            <div key={f.k} className="rounded-2xl border border-border/70 bg-card/30 p-5">
              <f.icon className="h-4 w-4 text-primary" />
              <div className="mt-4 font-display text-lg">{f.k}</div>
              <div className="text-xs text-muted-foreground">{f.v}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div>© THE SPOILED SALEM — sourced from public material only.</div>
          <div className="flex gap-4">
            <a href="/universes" className="hover:text-foreground">Universes</a>
            <a href="/discover" className="hover:text-foreground">Discover</a>
            <a href="/library" className="hover:text-foreground">Library</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
