import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { UNIVERSES } from "@/lib/catalog";

export const Route = createFileRoute("/universes")({
  head: () => ({
    meta: [
      { title: "Universes — THE SPOILED SALEM" },
      { name: "description", content: "Browse supported universes and jump into any adaptation." },
      { property: "og:title", content: "Universes — THE SPOILED SALEM" },
      { property: "og:description", content: "Browse supported universes." },
    ],
  }),
  component: UniversesPage,
});

function UniversesPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Universes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A curated slice — thousands more work too. Just search anything.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {UNIVERSES.map((u, i) => (
            <button
              key={u}
              onClick={() => navigate({ to: "/continue", search: { q: u } })}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 text-left transition hover:border-primary/60"
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                #{String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-3 font-display text-xl leading-tight">{u}</div>
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/25" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
