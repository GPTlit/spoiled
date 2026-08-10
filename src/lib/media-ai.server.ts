// Server-only multimodal understanding helpers (voice transcription, video/image reading).
// Uses Gemini through the gateway chat-completions endpoint because it accepts audio and video input.

const BASE = "https://ai.gateway.lovable.dev/v1";
const MM_MODEL = "google/gemini-3.6-flash";

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

async function toBase64(url: string): Promise<{ data: string; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the attachment (${res.status}).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { data: btoa(binary), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

async function mmChat(content: Array<Record<string, unknown>>): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key() },
    body: JSON.stringify({ model: MM_MODEL, messages: [{ role: "user", content }], temperature: 0.2 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Media read failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

function audioFormat(mime: string) {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export async function transcribeAudio(url: string): Promise<string> {
  const { data, contentType } = await toBase64(url);
  return (
    await mmChat([
      { type: "text", text: "Transcribe this voice message verbatim. Return only the transcript, no commentary." },
      { type: "input_audio", input_audio: { data, format: audioFormat(contentType) } },
    ])
  ).trim();
}

export async function describeVideo(url: string): Promise<string> {
  const { data, contentType } = await toBase64(url);
  return (
    await mmChat([
      {
        type: "text",
        text: "Describe what happens in this video in detail: the scene, people, actions, any on-screen text, and any dialogue you can hear. Be concrete.",
      },
      { type: "file", file: { filename: "clip", file_data: `data:${contentType};base64,${data}` } },
    ])
  ).trim();
}

export async function describeImage(url: string): Promise<string> {
  return (
    await mmChat([
      { type: "text", text: "Describe this image in detail, including any text visible in it." },
      { type: "image_url", image_url: { url } },
    ])
  ).trim();
}
