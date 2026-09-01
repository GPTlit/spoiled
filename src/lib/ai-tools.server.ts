// Shared AI tooling: every SPOILED AI gets live internet access.
import { responsesRun, userItem, type ToolDef, type ResponsesItem } from "./responses.server";
import { webSearch } from "./websearch.server";

export const SEARCH_TOOL: ToolDef = {
  type: "function",
  name: "web_search",
  description:
    "Search the live internet (wikis, news, TV/film databases, book and manga summaries, fan wikis) for facts: plot details, chapter/episode contents, release dates, casts, source-book mappings, anything after your training data or that you are unsure about. Use it freely and often.",
  strict: true,
  parameters: {
    type: "object",
    properties: { query: { type: "string", description: "The search query" } },
    required: ["query"],
    additionalProperties: false,
  },
};

export async function runSearchTool(name: string, args: Record<string, unknown>) {
  if (name !== "web_search") return "Unknown tool";
  return webSearch(String(args.query ?? ""));
}

/** Free-form generation with live web access. */
export async function aiText(opts: {
  instructions: string;
  prompt: string;
  images?: string[];
  reasoning?: "low" | "medium" | "high" | false;
  maxSteps?: number;
  history?: ResponsesItem[];
}) {
  const { text } = await responsesRun({
    instructions: opts.instructions,
    input: [...(opts.history ?? []), userItem(opts.prompt, opts.images ?? [])],
    tools: [SEARCH_TOOL],
    runTool: runSearchTool,
    reasoning: opts.reasoning ?? "low",
    maxSteps: opts.maxSteps ?? 4,
  });
  return text.trim();
}

function extractJson(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI returned an unreadable response. Please try again.");
  return body.slice(start, end + 1);
}

/** JSON generation with live web access. */
export async function aiJson<T>(opts: { instructions: string; prompt: string; maxSteps?: number }): Promise<T> {
  const text = await aiText({
    instructions: `${opts.instructions}\n\nReturn STRICT JSON only. No markdown fences, no prose.`,
    prompt: opts.prompt,
    reasoning: "low",
    maxSteps: opts.maxSteps ?? 4,
  });
  return JSON.parse(extractJson(text)) as T;
}

/** Image generation through the Lovable AI Gateway (used for covers and illustrations). */
export async function aiImage(prompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      modalities: ["image", "text"],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Too many image requests — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`Image generation failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("The image model returned nothing. Try a different prompt.");
  return url;
}
