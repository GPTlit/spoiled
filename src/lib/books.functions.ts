import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiText } from "./ai-tools.server";

export const BOOK_STYLES = ["Cinematic", "Screenplay", "Novel", "Dramatic", "Noir", "Documentary", "Poetic"] as const;

const LANGS: Record<string, string> = { en: "English", ar: "Arabic", fr: "French" };

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

const GenerateInput = z.object({
  showTitle: z.string().min(1).max(160),
  style: z.string().min(1).max(40),
  seasonFrom: z.number().int().min(1).max(50).default(1),
  seasonTo: z.number().int().min(1).max(50).default(1),
  coverUrl: z.string().max(2000).nullable().default(null),
  creator: z.string().max(160).default(""),
  language: z.string().max(5).default("en"),
});

export const generateShowBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => GenerateInput.parse(v))
  .handler(async ({ context, data }) => {
    const from = Math.min(data.seasonFrom, data.seasonTo);
    const to = Math.max(data.seasonFrom, data.seasonTo);
    const lang = LANGS[data.language] ?? "English";

    const instructions = `You are SPOILED's adaptation engine. You turn television into books.

Write in ${lang}. Style: ${data.style}.
- Cinematic: rich visual prose, present tense, film-grammar scene transitions.
- Screenplay: real sluglines (INT./EXT. — LOCATION — TIME), action lines, character cues, dialogue.
- Novel: literary past-tense prose with interiority.
- Dramatic / Noir / Documentary / Poetic: commit fully to that register.

RULES
- Cover the actual events of the show, season by season, episode by episode, in order. Nothing invented; use the web_search tool aggressively to confirm what really happens in each episode.
- Structure: "PART — Season N", then "Chapter N — <episode title>" for every episode, then the writing.
- Full spoilers are expected. This is a complete retelling.
- Plain text only. No markdown symbols, no asterisks, no commentary.`;

    const parts: string[] = [];
    for (let s = from; s <= to; s++) {
      const prompt = `Show: "${data.showTitle}". Write the complete Season ${s} part of the book: every episode of that season, in order, as its own chapter, covering every significant scene. Do not summarise the season in a paragraph — write it out. Begin with the line "PART — Season ${s}".${parts.length ? `\n\nFor continuity, the previous part ended with:\n"""\n${parts[parts.length - 1].slice(-1500)}\n"""` : ""}`;
      const text = await aiText({ instructions, prompt, reasoning: "medium", maxSteps: 6 });
      if (text) parts.push(text);
    }
    if (!parts.length) throw new Error("The book came back empty — try again.");

    let creator = data.creator.trim();
    if (!creator) {
      creator = (
        await aiText({
          instructions: "Answer with only the name(s) of the creator(s). No sentence, no punctuation beyond commas.",
          prompt: `Who created the TV show "${data.showTitle}"?`,
          reasoning: false,
          maxSteps: 3,
        })
      )
        .split("\n")[0]
        .slice(0, 120);
    }

    const content = `${parts.join("\n\n")}\n\n———\n\nCREDITS\n\n${data.showTitle} was created by ${creator || "its original creators"}.\nAll rights to the original work belong to its creators.\n\nSPOILED SALEM TEAM`;

    const { data: row, error } = await context.supabase
      .from("show_books")
      .insert({
        user_id: context.userId,
        show_title: data.showTitle,
        style: data.style,
        cover_url: data.coverUrl,
        credits: creator,
        content,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
