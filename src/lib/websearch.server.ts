// Server-only live web lookup. No API key required — uses public open endpoints.

type Hit = { title: string; snippet: string; url: string };

async function wikipedia(query: string): Promise<Hit[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srlimit=5&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "SPOILED/1.0" } });
  if (!res.ok) return [];
  const json = (await res.json()) as { query?: { search?: { title: string; snippet: string }[] } };
  return (json.query?.search ?? []).map((s) => ({
    title: s.title,
    snippet: s.snippet.replace(/<[^>]+>/g, ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`,
  }));
}

async function duckduckgo(query: string): Promise<Hit[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SPOILED/1.0" } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };
  const hits: Hit[] = [];
  if (json.AbstractText) {
    hits.push({ title: json.Heading ?? query, snippet: json.AbstractText, url: json.AbstractURL ?? "" });
  }
  for (const t of json.RelatedTopics ?? []) {
    if (t.Text && t.FirstURL) hits.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL });
    if (hits.length >= 6) break;
  }
  return hits;
}

async function tvmaze(query: string): Promise<Hit[]> {
  const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    show: { name: string; premiered?: string; status?: string; summary?: string; url: string };
  }[];
  return json.slice(0, 3).map((r) => ({
    title: `${r.show.name}${r.show.premiered ? ` (${r.show.premiered.slice(0, 4)})` : ""} — ${r.show.status ?? ""}`,
    snippet: (r.show.summary ?? "").replace(/<[^>]+>/g, "").slice(0, 400),
    url: r.show.url,
  }));
}

export async function webSearch(query: string): Promise<string> {
  const [wiki, ddg, shows] = await Promise.all([
    wikipedia(query).catch(() => [] as Hit[]),
    duckduckgo(query).catch(() => [] as Hit[]),
    tvmaze(query).catch(() => [] as Hit[]),
  ]);
  const all = [...shows, ...wiki, ...ddg].filter((h) => h.snippet).slice(0, 10);
  if (!all.length) return `No live results found for "${query}".`;
  return all
    .map((h, i) => `[${i + 1}] ${h.title}\n${h.snippet}\n${h.url}`)
    .join("\n\n")
    .slice(0, 9000);
}
