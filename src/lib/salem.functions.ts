import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { responsesRun, userItem, assistantItem, type ResponsesItem, type ToolDef } from "./responses.server";
import { webSearch } from "./websearch.server";
import { describeVideo, transcribeAudio } from "./media-ai.server";

export type SalemAttachment = { url: string; kind: "image" | "video" | "audio"; name?: string; transcript?: string };

const AttachmentSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["image", "video", "audio"]),
  name: z.string().max(200).optional(),
});

const SEARCH_TOOL: ToolDef = {
  type: "function",
  name: "web_search",
  description:
    "Search the live internet (news, wikis, TV databases) for current facts: release dates, cast, episode counts, recent events, anything after your training data. Use it whenever the user asks about something current or you are unsure.",
  strict: true,
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "The search query" } },
    required: ["query"],
    additionalProperties: false,
  },
};

function instructions(spoilers: boolean, lang: string) {
  const langName = lang === "ar" ? "Arabic" : lang === "fr" ? "French" : "English";
  return `You are SALEM — the resident AI of SPOILED, a companion app for people who watch too much TV. You talk about movies, shows, anime, books and theories like a friend at 2am, not like a wiki. Warm, funny, obsessive about details, opinionated but never mean.

Reply in ${langName}.

How you talk: conversational, short paragraphs, no bullet lists unless asked, no headings.

Your abilities:
- Source mapping: given "I finished X season Y", work out roughly where that lands in the source book/manga/game.
- Continuation: continue the story from that point using published source material.
- Breakdowns: recaps, foreshadowing, symbolism, adaptation differences.
- Theories: speculate, but label speculation as speculation.
- Live web search: you have a web_search tool. Use it for anything current, recent or uncertain, and mention casually that you looked it up.
- Media: the user can send photos, videos and voice notes. Descriptions and transcripts of them are given to you inline — treat them as if you saw or heard them yourself.

SPOILER RULE — currently ${spoilers ? "SPOILERS ON" : "SPOILERS OFF"}.
${
  spoilers
    ? 'Spoilers are ON: reveal what happens, including deaths, twists and endings, from anything publicly released. Open with a short line like "alright, spoilers on —".'
    : "Spoilers are OFF: never reveal deaths, twists or endings beyond where the user says they are. If they ask something spoilery, tell them to flip the spoiler switch and offer a spoiler-free version instead."
}

Never invent facts and present them as canon. If unsure, say so, or search. Keep replies under about 300 words unless asked to go long.`;
}

export const listSalemConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("salem_conversations").delete().eq("user_id", userId).lt("expires_at", new Date().toISOString());
    const { data, error } = await supabase
      .from("salem_conversations")
      .select("id, title, updated_at, expires_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSalemConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("salem_messages")
      .select("id, role, content, attachments, created_at")
      .eq("conversation_id", data.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteSalemConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("salem_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SendInput = z.object({
  conversationId: z.string().uuid().nullable(),
  text: z.string().max(4000).default(""),
  attachments: z.array(AttachmentSchema).max(4).default([]),
  spoilers: z.boolean().default(false),
  lang: z.string().max(5).default("en"),
});

export const salemSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SendInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.text.trim() && !data.attachments.length) throw new Error("Say something first.");

    // Read any voice notes / videos so SALEM can respond to them.
    const enriched: SalemAttachment[] = [];
    for (const a of data.attachments) {
      let transcript: string | undefined;
      try {
        if (a.kind === "audio") transcript = await transcribeAudio(a.url);
        else if (a.kind === "video") transcript = await describeVideo(a.url);
      } catch (err) {
        transcript = `(could not read this ${a.kind}: ${(err as Error).message})`;
      }
      enriched.push({ ...a, transcript });
    }

    // Ensure a conversation exists.
    let conversationId = data.conversationId;
    if (!conversationId) {
      const title = (data.text.trim() || "Voice note").slice(0, 60);
      const { data: conv, error } = await supabase
        .from("salem_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    }

    const { error: userErr } = await supabase.from("salem_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: data.text,
      attachments: enriched as never,
    });
    if (userErr) throw new Error(userErr.message);

    // Rebuild the conversation for the model.
    const { data: history } = await supabase
      .from("salem_messages")
      .select("role, content, attachments")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);

    const input: ResponsesItem[] = [];
    for (const m of history ?? []) {
      const atts = (m.attachments as unknown as SalemAttachment[]) ?? [];
      if (m.role === "assistant") {
        input.push(assistantItem(m.content || "..."));
        continue;
      }
      const notes = atts
        .filter((a) => a.transcript)
        .map((a) => (a.kind === "audio" ? `[voice note transcript] ${a.transcript}` : `[video the user shared] ${a.transcript}`))
        .join("\n");
      const images = atts.filter((a) => a.kind === "image").map((a) => a.url);
      const text = [m.content, notes].filter(Boolean).join("\n\n") || "(attachment only)";
      input.push(userItem(text, images));
    }

    const { text: reply, toolsUsed } = await responsesRun({
      instructions: instructions(data.spoilers, data.lang),
      input,
      tools: [SEARCH_TOOL],
      runTool: async (name, args) => (name === "web_search" ? webSearch(String(args.query ?? "")) : "Unknown tool"),
    });

    const finalText = reply.trim() || "I blanked on that one — ask me again?";

    const { error: aErr } = await supabase.from("salem_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: finalText,
      attachments: [] as never,
    });
    if (aErr) throw new Error(aErr.message);

    await supabase.from("salem_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return { conversationId, reply: finalText, attachments: enriched, searched: toolsUsed.includes("web_search") };
  });
