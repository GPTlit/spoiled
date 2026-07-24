import { supabase } from "@/integrations/supabase/client";

export type UploadResult = { path: string; url: string };

const MAX_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,
  video: 60 * 1024 * 1024,
  audio: 8 * 1024 * 1024,
};

export async function uploadMedia(
  bucket: "chat-media" | "feed-media",
  file: Blob | File,
  kind: "image" | "video" | "audio",
  ext?: string,
): Promise<UploadResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Please sign in to upload media.");
  if (file.size > MAX_SIZES[kind]) throw new Error(`File too large (max ${Math.round(MAX_SIZES[kind] / 1024 / 1024)}MB).`);

  const inferredExt = ext ?? (file instanceof File ? file.name.split(".").pop() : undefined) ?? guessExt(file.type, kind);
  const path = `${userData.user.id}/${crypto.randomUUID()}.${inferredExt}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const url = await signedUrl(bucket, path);
  return { path, url };
}

export async function signedUrl(bucket: string, path: string, expires = 60 * 60 * 24 * 365) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

function guessExt(mime: string, kind: string) {
  if (kind === "image") return mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  if (kind === "video") return mime.includes("webm") ? "webm" : "mp4";
  return "webm";
}
