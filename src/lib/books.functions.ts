import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiText } from "./ai-tools.server";

export const BOOK_STYLES = ["Cinematic", "Screenplay", "Novel", "Dramatic", "Noir", "Documentary", "Poetic"] as const;

const LANGS: Record<string, string> = { en: "English", ar: "Arabic", fr: "French" };

/** Characters that fit on one printed page (matches paginate() in src/lib/pdf.ts). */
const CHARS_PER_PAGE = 2600;
/** Pages written per AI call — keeps every request short enough to succeed. */
export const PAGES_PER_CHUNK = 5;

export const listBooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("show_books")
      .select("id, show_title, style, cover_url, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("show_books")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Book not found");
    return row;
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("show_books").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StartInput = z.object({
  showTitle: z.string().min(1).max(160),
  style: z.string().min(1).max(40),
  seasonFrom: z.number().int().min(1).max(50).default(1),
  seasonTo: z.number().int().min(1).max(50).default(1),
  pages: z.number().int().min(2).max(400).default(40),
  coverUrl: z.string().max(2000).nullable().default(null),
  language: z.string().max(5).default("en"),
});

/** Creates the empty book and tells the client how many writing passes to run. */
export const startBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => StartInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("show_books")
      .insert({
        user_id: context.userId,
        show_title: data.showTitle,
        style: data.style,
        cover_url: data.coverUrl,
        credits: "",
        content: "",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, chunks: Math.ceil(data.pages / PAGES_PER_CHUNK) };
  });

const ChunkInput = StartInput.extend({
  id: z.string().uuid(),
  index: z.number().int().min(0),
  chunks: z.number().int().min(1).max(100),
});

/** Writes one slice of the book and appends it. Short enough to never time out. */
export const writeBookChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ChunkInput.parse(v))
  .handler(async ({ context, data }) => {
    const from = Math.min(data.seasonFrom, data.seasonTo);
    const to = Math.max(data.seasonFrom, data.seasonTo);
    const lang = LANGS[data.language] ?? "English";

    const { data: current, error: readErr } = await context.supabase
      .from("show_books")
      .select("content")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) throw new Error("Book not found");

    const existing = (current.content as string) ?? "";
    const pagesThisPass = Math.max(1, Math.min(PAGES_PER_CHUNK, data.pages - data.index * PAGES_PER_CHUNK));
    const targetChars = pagesThisPass * CHARS_PER_PAGE;

    // Which stretch of the show this pass should cover.
    const totalSeasons = to - from + 1;
    const startFrac = data.index / data.chunks;
    const endFrac = (data.index + 1) / data.chunks;
    const seasonStart = from + Math.floor(startFrac * totalSeasons);
    const seasonEnd = from + Math.min(totalSeasons - 1, Math.ceil(endFrac * totalSeasons) - 1);
    const span =
      seasonStart === seasonEnd ? `Season ${seasonStart}` : `Seasons ${seasonStart} through ${seasonEnd}`;

    const instructions = `You are SPOILED's adaptation engine. You turn television into books.

Write in ${lang}. Style: ${data.style}.
- Cinematic: rich visual prose, present tense, film-grammar scene transitions.
- Screenplay: real sluglines (INT./EXT. — LOCATION — TIME), action lines, character cues, dialogue.
- Novel: literary past-tense prose with interiority.
- Dramatic / Noir / Documentary / Poetic: commit fully to that register.

RULES
- Retell the actual events of the show in order. Nothing invented; use the web_search tool to confirm what really happens.
- Head each season with "PART — Season N" and each episode with "Chapter — <episode title>".
- Full spoilers are expected.
- Plain text only. No markdown, no asterisks, no commentary about the task.
- Length matters: write roughly ${targetChars} characters in this pass. Do not stop early, do not summarise.`;

    const tail = existing.slice(-1200);
    const prompt = `Show: "${data.showTitle}".
This is writing pass ${data.index + 1} of ${data.chunks} for a book of about ${data.pages} printed pages covering seasons ${from}-${to}.
Cover ${span} in this pass — the portion that logically follows what came before — and write about ${pagesThisPass} printed pages (${targetChars} characters).
${tail ? `The book so far ends with:\n"""\n${tail}\n"""\nContinue seamlessly; do not repeat it.` : `Open the book with "PART — Season ${seasonStart}".`}`;

    const text = await aiText({ instructions, prompt, reasoning: "low", maxSteps: 4 });
    if (!text) throw new Error("That pass came back empty — press Continue to retry it.");

    const merged = existing ? `${existing}\n\n${text}` : text;
    const { error } = await context.supabase
      .from("show_books")
      .update({ content: merged })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return { chars: merged.length, pages: Math.ceil(merged.length / CHARS_PER_PAGE) };
  });

/** Adds the credits page and closes the book out. */
export const finishBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), showTitle: z.string().max(160) }).parse(v))
  .handler(async ({ context, data }) => {
    let creator = "";
    try {
      creator = (
        await aiText({
          instructions: "Answer with only the name(s) of the creator(s). No sentence.",
          prompt: `Who created the TV show "${data.showTitle}"?`,
          reasoning: false,
          maxSteps: 2,
        })
      )
        .split("\n")[0]
        .slice(0, 120);
    } catch {
      creator = "";
    }

    const { data: row, error: readErr } = await context.supabase
      .from("show_books")
      .select("content")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Book not found");

    const content = `${(row.content as string) ?? ""}\n\n———\n\nCREDITS\n\n${data.showTitle} was created by ${
      creator || "its original creators"
    }.\nAll rights to the original work belong to its creators.\n\nSPOILED SALEM TEAM`;

    const { error } = await context.supabase
      .from("show_books")
      .update({ content, credits: creator })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
