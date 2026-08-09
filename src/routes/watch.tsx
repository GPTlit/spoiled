import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SERVICES, SERVICE_TITLES } from "@/lib/services";

export const Route = createFileRoute("/watch")({
  component: WatchIndex,
  head: () => ({
    meta: [
      { title: "Watch — SPOILED" },
      { name: "description", content: "Browse shows and movies across every streaming service, get AI breakdowns for any episode." },
      { property: "og:title", content: "Watch — SPOILED" },
      { property: "og:description", content: "Netflix, Prime Video, Apple TV+, Max and more — pick a show, pick an episode, get the breakdown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WatchIndex() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Where do you watch?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a service, tap any show, then any episode — get the recap, the clues, and (for unreleased episodes) predictions from the source material.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              to="/watch/$service"
              params={{ service: s.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/60"
            >
              <div className="flex aspect-[16/10] items-center justify-center overflow-hidden" style={{ backgroundColor: s.color }}>
                <img src={s.logo} alt={`${s.name} logo`} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-105" />
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
                <span>{s.name}</span>
                <span className="text-xs text-muted-foreground">{(SERVICE_TITLES[s.slug] ?? []).length}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
