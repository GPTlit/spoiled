import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiText, aiImage } from "./ai-tools.server";

const LANGS: Record<string, string> = { en: "English", ar: "Arabic", fr: "French" };

function writerInstructions(p: {
  title: string;
  genre: string;
  tone: string;
  style: string;
  logline: string;
  language: string;
}) {
  return `You are SCREEN WRITER — SPOILED's screenwriting partner. You write like a working, produced screenwriter: economical, visual, no filler.

PROJECT
Title: ${p.title || "Untitled"}
Genre: ${p.genre || "unspecified"}
Tone: ${p.tone || "unspecified"}
Format: ${p.style || "Screenplay"}
Logline: ${p.logline || "(none given)"}
Write in ${LANGS[p.language] ?? "English"}.

RULES
- Follow the writer's instructions exactly: key points, beat order, scene length, what a scene must lead into.
- Fill the gaps yourself: action, subtext, escalation, pacing, silence where it lands harder.
- Every character gets a distinct voice — vocabulary, rhythm, what they avoid saying.
- Screenplay format means real sluglines (INT./EXT. — LOCATION — TIME), tight action lines in present tense, character cues in caps, dialogue underneath. Novel format means prose.
- If the writer pastes their own pages, continue seamlessly in THEIR voice — match diction, sentence length and formatting. Never restart or summarise.
- You have live web access: use it to check real places, procedures, history, or how a referenced film handles a beat.
- Output only the pages. No notes, no preamble, no markdown headings, no commentary.`;
}

const ProjectFields = z.object({
  title: z.string().max(120).default("Untitled"),
  logline: z.string().max(2000).default(""),
  genre: z.string().max(60).default(""),
  tone: z.string().max(60).default(""),
  style: z.string().max(40).default("Screenplay"),
  language: z.string().max(5).default("en"),
});

export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sw_projects")
      .select("id, title, logline, genre, tone, style, language, cover_url, is_public, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ProjectFields.partial().parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("sw_projects")
      .insert({ ...data, user_id: context.userId, title: data.title || "Untitled" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("sw_pages")
      .insert({ project_id: row.id, user_id: context.userId, page_index: 0, content: "" });
    return row;
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: project, error } = await context.supabase
      .from("sw_projects")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");
    const { data: pages } = await context.supabase
      .from("sw_pages")
      .select("id, page_index, content, image_url")
      .eq("project_id", data.id)
      .order("page_index", { ascending: true });
    return { project, pages: pages ?? [] };
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    ProjectFields.partial()
      .extend({ id: z.string().uuid(), cover_url: z.string().max(2000).nullable().optional(), is_public: z.boolean().optional() })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase
      .from("sw_projects")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sw_projects").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        pages: z
          .array(
            z.object({
              id: z.string().uuid().optional(),
              page_index: z.number().int().min(0).max(999),
              content: z.string().max(60000).default(""),
              image_url: z.string().max(2000).nullable().optional(),
            }),
          )
          .max(200),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("sw_pages")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("user_id", userId);
    const keep = new Set(data.pages.map((p) => p.id).filter(Boolean) as string[]);
    const stale = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));

    for (const p of data.pages) {
      if (p.id) {
        await supabase
          .from("sw_pages")
          .update({ content: p.content, image_url: p.image_url ?? null, page_index: p.page_index })
          .eq("id", p.id)
          .eq("user_id", userId);
      } else {
        await supabase.from("sw_pages").insert({
          project_id: data.projectId,
          user_id: userId,
          page_index: p.page_index,
          content: p.content,
          image_url: p.image_url ?? null,
        });
      }
    }
    if (stale.length) await supabase.from("sw_pages").delete().in("id", stale).eq("user_id", userId);
    await supabase.from("sw_projects").update({ updated_at: new Date().toISOString() }).eq("id", data.projectId).eq("user_id", userId);
    return { ok: true };
  });

const WriteInput = z.object({
  projectId: z.string().uuid(),
  instruction: z.string().min(1).max(4000),
  existing: z.string().max(20000).default(""),
  targetLength: z.enum(["short", "medium", "long"]).default("medium"),
});

export const writeScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => WriteInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: p, error } = await context.supabase
      .from("sw_projects")
      .select("title, logline, genre, tone, style, language")
      .eq("id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Project not found");

    const lengths = {
      short: "about 250-400 words (a tight scene)",
      medium: "about 600-900 words (a full scene with a turn)",
      long: "about 1200-1800 words (a sequence of connected scenes)",
    } as const;

    const prompt = `${data.existing.trim() ? `WHAT IS ALREADY WRITTEN (continue seamlessly from the end of this, do not repeat it):\n"""\n${data.existing.slice(-8000)}\n"""\n\n` : ""}INSTRUCTIONS FROM THE WRITER:\n${data.instruction}\n\nTarget length: ${lengths[data.targetLength]}.`;

    const text = await aiText({
      instructions: writerInstructions(p as never),
      prompt,
      reasoning: "medium",
    });
    if (!text) throw new Error("The writer came back empty — try rephrasing the instruction.");
    return { text };
  });

export const generateArtwork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ prompt: z.string().min(3).max(1200), kind: z.enum(["cover", "illustration"]).default("illustration") }).parse(v),
  )
  .handler(async ({ data }) => {
    const styled =
      data.kind === "cover"
        ? `A cinematic book/film poster cover. ${data.prompt}. Dramatic lighting, rich contrast, no text, no lettering, no watermark, portrait composition.`
        : `A cinematic story illustration. ${data.prompt}. Moody film-still lighting, no text, no watermark.`;
    const url = await aiImage(styled);
    return { dataUrl: url };
  });
