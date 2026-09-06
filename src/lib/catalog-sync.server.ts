// Server-only: grows the streaming library automatically from TVmaze (free, no key).
import { slugify } from "./services";

const NETWORK_MAP: Record<string, string> = {
  "netflix": "netflix",
  "amazon prime video": "prime-video",
  "prime video": "prime-video",
  "amazon": "prime-video",
  "apple tv+": "apple-tv",
  "apple tv plus": "apple-tv",
  "paramount+": "paramount-plus",
  "paramount network": "paramount-plus",
  "cbs": "paramount-plus",
  "disney+": "disney-plus",
  "disney channel": "disney-plus",
  "fx": "hulu",
  "hulu": "hulu",
  "peacock": "peacock",
  "nbc": "peacock",
  "amc": "amc-plus",
  "amc+": "amc-plus",
  "hbo": "hbo",
  "hbo max": "hbo",
  "max": "hbo",
};

type TvmazeShow = {
  id: number;
  name: string;
  premiered: string | null;
  genres: string[];
  summary: string | null;
  weight?: number;
  image?: { original?: string; medium?: string } | null;
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
};

function serviceFor(show: TvmazeShow): string | null {
  const names = [show.webChannel?.name, show.network?.name].filter(Boolean) as string[];
  for (const n of names) {
    const hit = NETWORK_MAP[n.trim().toLowerCase()];
    if (hit) return hit;
  }
  return null;
}

function stripHtml(s: string | null): string {
  return (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export type SyncResult = { added: number; scanned: number; note: string };

/** Pulls a couple of TVmaze index pages and inserts any titles we don't have yet. */
export async function growLibrary(pages = 3): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Rotate through TVmaze index pages so each daily run covers new ground.
  const { count } = await supabaseAdmin
    .from("catalog_sync_runs")
    .select("id", { count: "exact", head: true });
  const offset = ((count ?? 0) * pages) % 60;

  let scanned = 0;
  type CatalogInsert = {
    service: string; title: string; slug: string; year: number | null;
    poster: string | null; description: string; genres: string[]; popularity: number;
  };
  const rows: CatalogInsert[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < pages; i++) {
    const page = offset + i;
    const res = await fetch(`https://api.tvmaze.com/shows?page=${page}`);
    if (!res.ok) continue;
    const shows = (await res.json()) as TvmazeShow[];
    scanned += shows.length;
    for (const show of shows) {
      const service = serviceFor(show);
      const poster = show.image?.original ?? show.image?.medium ?? null;
      if (!service || !poster || !show.name) continue;
      const slug = slugify(show.name);
      const key = `${service}/${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        service,
        title: show.name,
        slug,
        year: show.premiered ? Number(show.premiered.slice(0, 4)) : null,
        poster,
        description: stripHtml(show.summary).slice(0, 900),
        genres: show.genres ?? [],
        popularity: show.weight ?? 0,
      });
    }
  }

  let added = 0;
  if (rows.length) {
    const { data, error } = await supabaseAdmin
      .from("catalog_titles")
      .upsert(rows, { onConflict: "service,slug", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    added = data?.length ?? 0;
  }

  const note = `TVmaze pages ${offset}-${offset + pages - 1}`;
  await supabaseAdmin.from("catalog_sync_runs").insert({ added, scanned, note });
  return { added, scanned, note };
}
