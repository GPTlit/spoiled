// Server-only AI provider resolution.
// SPOILED can run on the Lovable AI Gateway (default) OR on any OpenAI-compatible
// free-tier provider, so the app keeps working when it is hosted elsewhere (Netlify, etc.).
//
// Provide ONE of these environment variables on your host:
//   XAI_API_KEY        -> Grok            (https://api.x.ai/v1)
//   GROQ_API_KEY       -> Groq free tier  (https://api.groq.com/openai/v1)
//   OPENROUTER_API_KEY -> OpenRouter      (https://openrouter.ai/api/v1) — has :free models
//   GEMINI_API_KEY     -> Google AI Studio free tier
// Optional model overrides: XAI_MODEL, GROQ_MODEL, OPENROUTER_MODEL, GEMINI_MODEL.

export type Provider = {
  id: "lovable" | "xai" | "groq" | "openrouter" | "gemini";
  base: string;
  key: string;
  model: string;
  headers: Record<string, string>;
};

const env = (n: string) => process.env[n]?.trim() || "";

function xai(): Provider | null {
  const key = env("XAI_API_KEY");
  if (!key) return null;
  return {
    id: "xai",
    base: "https://api.x.ai/v1",
    key,
    model: env("XAI_MODEL") || "grok-3-mini",
    headers: { Authorization: `Bearer ${key}` },
  };
}

function groq(): Provider | null {
  const key = env("GROQ_API_KEY");
  if (!key) return null;
  return {
    id: "groq",
    base: "https://api.groq.com/openai/v1",
    key,
    model: env("GROQ_MODEL") || "llama-3.3-70b-versatile",
    headers: { Authorization: `Bearer ${key}` },
  };
}

function openrouter(): Provider | null {
  const key = env("OPENROUTER_API_KEY");
  if (!key) return null;
  return {
    id: "openrouter",
    base: "https://openrouter.ai/api/v1",
    key,
    model: env("OPENROUTER_MODEL") || "meta-llama/llama-3.3-70b-instruct:free",
    headers: { Authorization: `Bearer ${key}`, "X-Title": "SPOILED" },
  };
}

function gemini(): Provider | null {
  const key = env("GEMINI_API_KEY");
  if (!key) return null;
  return {
    id: "gemini",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    key,
    model: env("GEMINI_MODEL") || "gemini-2.0-flash",
    headers: { Authorization: `Bearer ${key}` },
  };
}

function lovable(model?: string): Provider | null {
  const key = env("LOVABLE_API_KEY");
  if (!key) return null;
  return {
    id: "lovable",
    base: "https://ai.gateway.lovable.dev/v1",
    key,
    model: model || "openai/gpt-5.6-sol",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
  };
}

/**
 * Pick the provider to use.
 * `preferGrok` is used by SALEM, which should speak through Grok whenever an xAI key exists.
 */
export function pickProvider(opts?: { preferGrok?: boolean; model?: string }): Provider {
  const order = opts?.preferGrok
    ? [xai, lovable, groq, openrouter, gemini]
    : [lovable, xai, groq, openrouter, gemini];
  for (const f of order) {
    const p = f === lovable ? lovable(opts?.model) : (f as () => Provider | null)();
    if (p) return p;
  }
  throw new Error(
    "No AI key configured. Add LOVABLE_API_KEY, XAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY or GEMINI_API_KEY to your hosting environment.",
  );
}

export function providerError(status: number, text: string): Error {
  if (status === 429) return new Error("The AI is getting a lot of requests right now — try again in a moment.");
  if (status === 402) return new Error("AI credits are exhausted. Add credits or set a free-tier API key.");
  if (status === 401 || status === 403) return new Error("The AI key was rejected. Check the API key on your host.");
  return new Error(`AI error ${status}: ${text.slice(0, 300)}`);
}
