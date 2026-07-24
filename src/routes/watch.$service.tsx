import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SERVICE_TITLES, findService, slugify } from "@/lib/services";
import { Search } from "lucide-react";

export const Route = createFileRoute("/watch/$service")({
  component: ServicePage,
  head: ({ params }) => {
    const s = findService(params.service);
    const name = s?.name ?? "Service";
    return { meta: [
      { title: `${name} — SPOILED` },
      { name: "description", content: `Shows and movies on ${name}. Get AI breakdowns for any episode.` },
    ]};
  },
});

function ServicePage() {
  const { service } = Route.useParams();
  const navigate = useNavigate();
  const s = findService(service);
  const titles = SERVICE_TITLES[service] ?? [];
  const [q, setQ] = useState("");

  if (!s) return <div className="p-10">Unknown service.</div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/watch/$service/$title", params: { service, title: slugify(q.trim()) }, search: { q: q.trim() } });
  };

  const light = s.color === "#FFFFFF" || s.color === "#F5F5F7";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/watch" className="text-xs text-muted-foreground hover:text-foreground">← All services</Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: s.color, color: light ? "#0B0B0F" : "#FFFFFF" }}>
            <div className="text-lg font-black">{s.short || s.name.split(" ")[0]}</div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{s.name}</h1>
            <p className="text-sm text-muted-foreground">Pick a title or search anything on {s.name}.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
          <Search className="ml-2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any title..." className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/60" />
          <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">Go</button>
        </form>

        <h2 className="mt-8 text-lg font-semibold">Popular on {s.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {titles.map((t) => (
            <Link
              key={t.title}
              to="/watch/$service/$title"
              params={{ service, title: slugify(t.title) }}
              search={{ q: t.title }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60"
            >
              <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-primary/25 via-card to-card p-4 text-center">
                <div className="text-sm font-semibold">{t.title}</div>
              </div>
              <div className="border-t border-border p-2 text-center text-[11px] text-muted-foreground">{t.year} · {t.kind}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
