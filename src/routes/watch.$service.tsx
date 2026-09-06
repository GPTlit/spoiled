import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_TITLES, findService, slugify } from "@/lib/services";
import { Search } from "lucide-react";

type CatalogRow = { title: string; slug: string; year: number | null; poster: string | null; description: string | null; genres: string[] };

export const Route = createFileRoute("/watch/$service")({
  component: ServicePage,
  head: ({ params }) => {
    const s = findService(params.service);
    const name = s?.name ?? "Service";
    return {
      meta: [
        { title: `${name} shows — SPOILED` },
        { name: "description", content: `Popular shows and movies on ${name}, with AI breakdowns, clues and spoilers for any episode.` },
        { property: "og:title", content: `${name} shows — SPOILED` },
        { property: "og:description", content: `Browse ${name} and get episode-level breakdowns.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function ServicePage() {
  const { service } = Route.useParams();
  const navigate = useNavigate();
  const s = findService(service);
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<CatalogRow[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("catalog_titles")
      .select("title, slug, year, poster, description, genres")
      .eq("service", service)
      .order("popularity", { ascending: false })
      .limit(200)
      .then(({ data }) => { if (alive && data) setExtra(data as CatalogRow[]); });
    return () => { alive = false; };
  }, [service]);

  const titles = useMemo(() => {
    const base = (SERVICE_TITLES[service] ?? []).map((t) => ({
      title: t.title, slug: slugify(t.title), year: t.year ?? null, poster: t.poster,
      description: t.description ?? "", genres: t.genres ?? [],
    }));
    const seen = new Set(base.map((b) => b.slug));
    for (const r of extra) {
      if (seen.has(r.slug) || !r.poster) continue;
      seen.add(r.slug);
      base.push({ title: r.title, slug: r.slug, year: r.year, poster: r.poster, description: r.description ?? "", genres: r.genres ?? [] });
    }
    return base;
  }, [service, extra]);

  if (!s) return <div className="p-10">Unknown service.</div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/watch/$service/$title", params: { service, title: slugify(q.trim()) }, search: { q: q.trim() } });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/watch" className="text-xs text-muted-foreground hover:text-foreground">← All services</Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: s.color }}>
            <img src={s.logo} alt={`${s.name} logo`} className="h-full w-full object-contain" />
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

        <h2 className="mt-8 text-lg font-semibold">Popular on {s.name} <span className="text-xs font-normal text-muted-foreground">({titles.length} titles)</span></h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {titles.map((t) => (
            <Link
              key={t.slug}
              to="/watch/$service/$title"
              params={{ service, title: t.slug }}
              search={{ q: t.title }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/60"
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-background">
                <img src={t.poster} alt={`${t.title} poster`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <div className="text-sm font-semibold text-white">{t.title}</div>
                  <div className="text-[11px] text-white/70">{t.year ?? "—"}{t.genres.length ? ` · ${t.genres.slice(0, 2).join(", ")}` : ""}</div>
                </div>
              </div>
              <p className="line-clamp-3 p-3 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
