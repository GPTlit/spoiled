import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type TheoryRow = {
  id: string;
  show_title: string;
  show_slug: string;
  poster_url: string | null;
  show_summary: string | null;
  title: string;
  body: string;
  sort_order: number;
};

export const listTheories = createServerFn({ method: "GET" }).handler(async () => {
  const client = await publicClient();
  const { data, error } = await client
    .from("theories")
    .select("id, show_title, show_slug, poster_url, show_summary, title, body, sort_order")
    .order("show_title", { ascending: true })
    .order("sort_order", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as TheoryRow[];
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(5).max(4000),
  show_summary: z.string().trim().max(400).optional(),
});

export const adminUpdateTheory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => UpdateInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const patch: { title: string; body: string; show_summary?: string } = { title: data.title, body: data.body };
    if (data.show_summary !== undefined) patch.show_summary = data.show_summary;
    const { error } = await context.supabase.from("theories").update(patch).eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const CreateInput = z.object({
  show_title: z.string().trim().min(1).max(140),
  poster_url: z.string().trim().url().optional(),
  show_summary: z.string().trim().max(400).optional(),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().min(5).max(4000),
});

export const adminCreateTheory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CreateInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const slug = data.show_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const { error } = await context.supabase.from("theories").insert({
      show_title: data.show_title,
      show_slug: slug,
      poster_url: data.poster_url ?? null,
      show_summary: data.show_summary ?? null,
      title: data.title,
      body: data.body,
      sort_order: 99,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTheory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase.from("theories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
