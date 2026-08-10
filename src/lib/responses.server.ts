// Server-only helper for the Lovable AI Gateway Responses API (streaming, tool-capable).

const BASE = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_MODEL = "openai/gpt-5.6-sol";

export type ResponsesItem = Record<string, unknown>;

export type ToolDef = {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
};

type CompletedEvent = {
  response?: {
    output?: Array<Record<string, unknown>>;
    output_text?: string;
  };
};

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

async function readCompleted(res: Response): Promise<CompletedEvent["response"]> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream from the AI gateway.");
  const decoder = new TextDecoder();
  let buffer = "";
  let last: CompletedEvent["response"] | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { type?: string } & CompletedEvent;
        if (evt.type === "response.completed" && evt.response) last = evt.response;
      } catch {
        /* partial event, ignore */
      }
    }
  }
  if (!last) throw new Error("The AI did not return a complete response. Please try again.");
  return last;
}

function outputText(response: CompletedEvent["response"]) {
  if (response?.output_text && typeof response.output_text === "string") return response.output_text;
  const parts: string[] = [];
  for (const item of response?.output ?? []) {
    if (item.type === "message") {
      for (const c of (item.content as Array<Record<string, unknown>>) ?? []) {
        if (c.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export async function responsesRun(opts: {
  model?: string;
  instructions: string;
  input: ResponsesItem[];
  tools?: ToolDef[];
  runTool?: (name: string, args: Record<string, unknown>) => Promise<string>;
  maxSteps?: number;
  reasoning?: "low" | "medium" | "high" | false;
}): Promise<{ text: string; toolsUsed: string[] }> {
  const input = [...opts.input];
  const toolsUsed: string[] = [];
  const maxSteps = opts.maxSteps ?? 4;

  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = {
      model: opts.model ?? DEFAULT_MODEL,
      instructions: opts.instructions,
      input,
      stream: true,
      store: false,
    };
    if (opts.tools?.length) body.tools = opts.tools;
    if (opts.reasoning !== false) {
      body.reasoning = { effort: opts.reasoning ?? "low", summary: "auto" };
      body.include = ["reasoning.encrypted_content"];
    }

    const res = await fetch(`${BASE}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key(),
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("SALEM is getting a lot of requests right now — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 400)}`);
    }

    const response = await readCompleted(res);
    const output = (response?.output ?? []) as Array<Record<string, unknown>>;
    const calls = output.filter((o) => o.type === "function_call");

    if (!calls.length || !opts.runTool) {
      const text = outputText(response);
      return { text, toolsUsed };
    }

    input.push(...output);
    for (const call of calls) {
      const name = String(call.name ?? "");
      toolsUsed.push(name);
      let result = "";
      try {
        const args = JSON.parse(String(call.arguments ?? "{}")) as Record<string, unknown>;
        result = await opts.runTool(name, args);
      } catch (err) {
        result = `Tool failed: ${(err as Error).message}`;
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output: result.slice(0, 12000) });
    }
  }

  return { text: "", toolsUsed };
}

export function userItem(text: string, imageUrls: string[] = []): ResponsesItem {
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text }];
  for (const url of imageUrls) content.push({ type: "input_image", image_url: url });
  return { type: "message", role: "user", content };
}

export function assistantItem(text: string): ResponsesItem {
  return { type: "message", role: "assistant", content: [{ type: "output_text", text }] };
}
