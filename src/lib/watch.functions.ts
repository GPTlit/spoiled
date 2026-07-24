import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletion } from "./ai-gateway.server";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function cacheGet(kind: string, key: string) {
  const client = await publicClient();
  const { data } = await client.from("ai_cache").select("content").eq("kind", kind).eq("key", key).maybeSingle();
  return (data?.content as unknown) ?? null;
}

async function cacheSet(kind: string, key: string, content: unknown) {
  const { createClient } = await import("@supabase/supabase-js");
  const key2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key2) return;
  const admin = createClient(process.env.SUPABASE_URL!, key2, { auth: { persistSession: false } });
  await admin.from("ai_cache").upsert({ kind, key, content: content as never }, { onConflict: "kind,key" });
}

const TitleInput = z.object({
  service: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  year: z.number().int().optional(),
});

export type TitleInfo = {
  title: string;
  year: number | null;
  kind: "series" | "movie";
  synopsis: string;
  source_material: string;
  seasons: { number: number; episodes: number; year: number | null }[];
};

export const getTitleInfo = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => TitleInput.parse(v))
  .handler(async ({ data }) => {
    const cacheKey = `${data.service}::${data.title.toLowerCase()}::${data.year ?? ""}`;
    const cached = await cacheGet("title", cacheKey);
    if (cached) return cached as TitleInfo;
    const system = `You are the entertainment metadata engine for SPOILED. Given a streaming service and a title, return factual, publicly-known metadata. Never invent seasons or episode counts. If you don't know a season's exact episode count, use your best estimate and mark it. Return STRICT JSON only:
{
  "title": string,
  "year": number|null,
  "kind": "series"|"movie",
  "synopsis": string (<= 400 chars),
  "source_material": string (book, comic, game the show is based on, or "Original screenplay"),
  "seasons": [{ "number": number, "episodes": number, "year": number|null }]
}`;
    const user = `Service: ${data.service}. Title: "${data.title}"${data.year ? ` (${data.year})` : ""}. Return metadata.`;
    const raw = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      temperature: 0.1,
    });
    const parsed = JSON.parse(raw) as TitleInfo;
    await cacheSet("title", cacheKey, parsed);
    return parsed;
  });

const EpisodeInput = z.object({
  service: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  season: z.number().int().min(0).max(50),
  episode: z.number().int().min(0).max(500),
  released: z.boolean().default(true),
});

export type EpisodeAnalysis = {
  episode_title: string;
  released: boolean;
  recap: string;
  clues: string[];
  book_source: string;
  differences: string;
  spoilers_next: string;
  predictions?: string;
};

export const getEpisodeAnalysis = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => EpisodeInput.parse(v))
  .handler(async ({ data }) => {
    const cacheKey = `${data.service}::${data.title.toLowerCase()}::S${data.season}E${data.episode}::${data.released ? "r" : "u"}`;
    const cached = await cacheGet("episode", cacheKey);
    if (cached) return cached as EpisodeAnalysis;
    const system = `You are the episode analysis engine for SPOILED. Given a title/season/episode, return STRICT JSON only:
{
  "episode_title": string,
  "released": boolean,
  "recap": string (<= 600 chars, what happens in this episode),
  "clues": [string, string, string] (foreshadowing, symbols, callbacks — 3 items, <= 120 chars each),
  "book_source": string (which chapter/arc of the source material this maps to, or "no external source"),
  "differences": string (<= 300 chars, adaptation differences),
  "spoilers_next": string (<= 300 chars, what happens in the NEXT episode from public knowledge; if unknown/unreleased, describe likely direction based on published source material only),
  "predictions": string (only if this episode is unreleased; <= 400 chars; predictions strictly based on public source material, never invented)
}
Never invent facts. If the episode does not exist or is unreleased, set released=false and produce predictions from the source material only.`;
    const user = `Service: ${data.service}. Title: "${data.title}". Season ${data.season}, Episode ${data.episode}.`;
    const raw = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      temperature: 0.3,
    });
    const parsed = JSON.parse(raw) as EpisodeAnalysis;
    await cacheSet("episode", cacheKey, parsed);
    return parsed;
  });
