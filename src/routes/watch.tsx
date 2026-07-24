import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SERVICES } from "@/lib/services";

export const Route = createFileRoute("/watch")({
  component: WatchIndex,
  head: () => ({
    meta: [
      { title: "Watch — SPOILED" },
      { name: "description", content: "Browse shows and movies across every streaming service, get AI breakdowns for any episode." },
    ],
  }),
});

function WatchIndex() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Where do you watch?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a service, tap any show, then any episode — get the recap, the clues, and (for unreleased episodes) predictions from the source material.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((s) => {
            const light = s.color === "#FFFFFF" || s.color === "#F5F5F7";
            return (
              <Link
                key={s.slug}
                to="/watch/$service"
                params={{ service: s.slug }}
                className="group aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/60"
              >
                <div className="flex h-2/3 items-center justify-center" style={{ backgroundColor: s.color, color: light ? "#0B0B0F" : "#FFFFFF" }}>
                  <div className="text-2xl font-black tracking-tight">{s.short || s.name.split(" ")[0]}</div>
                </div>
                <div className="flex h-1/3 items-center justify-center px-2 text-center text-sm font-medium">{s.name}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
