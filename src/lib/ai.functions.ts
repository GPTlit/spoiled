import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletion } from "./ai-gateway.server";

const MapInput = z.object({ query: z.string().min(1).max(300) });

export const mapSource = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => MapInput.parse(v))
  .handler(async ({ data }) => {
    const system = `You are the source-mapping engine for THE SPOILED SALEM, an adaptation companion.
Given an entertainment consumption point (episode, chapter, movie), map it to the ORIGINAL SOURCE MATERIAL (books, manga, comics, light novels, games).
Never invent facts. If the mapping is uncertain, lower the confidence. If the work has no known source, set has_source=false and explain.
Return ONLY strict JSON, no prose, no markdown.
Shape:
{
 "input_title": string, "input_type": "tv|anime|movie|game|comic|book|other",
 "franchise": string,
 "has_source": boolean,
 "source": { "type": "book|manga|light_novel|comic|game|screenplay|none", "title": string, "part": string },
 "location": { "chapter_or_section": string, "approximate": boolean },
 "confidence": number, // 0-100
 "reasoning": string,  // <= 300 chars, cites what publicly-known material this is based on
 "differences": string, // <= 400 chars, notable adaptation vs source differences at this point
 "supported_universes_note": string // <= 160 chars
}`;
    const user = `User just finished: "${data.query}". Map to source material and give the equivalent point.`;
    const content = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      jsonMode: true,
      temperature: 0.2,
    });
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("The AI returned an unreadable response. Please try again.");
    }
  });

const ContinueInput = z.object({
  query: z.string().min(1).max(300),
  mapping: z.unknown(),
  mode: z.string().min(1).max(40),
  spoilerLevel: z.number().int().min(1).max(4),
});

export const continueStory = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => ContinueInput.parse(v))
  .handler(async ({ data }) => {
    const spoilerRules: Record<number, string> = {
      1: "Cover ONLY the immediate next episode / next chapter. Stop at that boundary.",
      2: "Cover to the end of the current season / current book. Do not cross into the next.",
      3: "Cover to the end of the current book / current arc.",
      4: "Cover the entire franchise arc from this point to its conclusion (major beats).",
    };
    const modeRules: Record<string, string> = {
      Screenplay: "Format as a proper screenplay with sluglines (INT./EXT.), action lines, and character dialogue.",
      "Movie Script": "Format as a Hollywood movie script with scene headings and sparse action lines.",
      "Novel Style": "Write literary prose with paragraphs, internal monologue, and sensory detail.",
      Narrator: "Write as an omniscient narrator recounting events.",
      "Character POV": "Write in first-person from the most emotionally central character at this point.",
      Timeline: "Return a chronological bullet timeline of events.",
      "Bullet Summary": "Return concise, spoiler-safe bullet points.",
      "Explain Like I'm 10": "Explain plainly and warmly, as to a curious kid.",
      Documentary: "Write as a documentary voiceover, sober and citing 'accounts'.",
      Horror: "Amplify dread, quiet menace, sensory unease. Stay faithful to the source events.",
      Action: "Punch up pacing, kinetic beats, short sentences.",
      Cinematic: "Write vivid, image-driven prose that reads like a director's shot list interleaved with narration.",
    };
    const system = `You are the continuation engine for THE SPOILED SALEM.
STRICT RULES:
- Never invent facts. Always follow the ORIGINAL SOURCE material described in the mapping.
- Where source is uncertain, say so briefly at the top in one line.
- If the mapping's confidence is low, add a one-line caveat and prefer safer, well-attested beats.
- Do not describe events beyond the requested spoiler scope.
- Do not fabricate names, dates, or plot points that are not in the public source.
Style: ${modeRules[data.mode] ?? "Write cleanly."}
Scope: ${spoilerRules[data.spoilerLevel] ?? spoilerRules[1]}
Length target: 500-900 words.`;
    const user = `User finished: "${data.query}".
Source mapping (JSON): ${JSON.stringify(data.mapping)}
Continue from this exact point in the SOURCE material, in the requested style and spoiler scope. Do not include a preface — begin the continuation directly. Use plain text or the style's native formatting; no markdown headers.`;
    const content = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.85,
    });
    return { content };
  });

const FollowupInput = z.object({
  query: z.string().min(1).max(300),
  mapping: z.unknown(),
  previous: z.string().min(1).max(20000),
  question: z.string().min(1).max(300),
});

export const askFollowup = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => FollowupInput.parse(v))
  .handler(async ({ data }) => {
    const system = `You are THE SPOILED SALEM's follow-up engine. Answer only from public source material. Never invent facts. If uncertain, label clearly. Keep answers under 250 words.`;
    const user = `Original point: "${data.query}"
Mapping: ${JSON.stringify(data.mapping)}
Previous continuation:
"""${data.previous.slice(0, 6000)}"""
User asks: "${data.question}"`;
    const content = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    });
    return { content };
  });
