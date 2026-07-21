import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listContinuations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("continuations")
      .select("id, query, mapping, mode, spoiler_level, content, is_bookmarked, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const SaveInput = z.object({
  query: z.string().min(1).max(300),
  mapping: z.unknown(),
  mode: z.string().min(1).max(40),
  spoilerLevel: z.number().int().min(1).max(4),
  content: z.string().min(1).max(50000),
  bookmark: z.boolean().default(true),
});

export const saveContinuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SaveInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("continuations")
      .insert({
        user_id: context.userId,
        query: data.query,
        mapping: data.mapping as never,
        mode: data.mode,
        spoiler_level: data.spoilerLevel,
        content: data.content,
        is_bookmarked: data.bookmark,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const ToggleInput = z.object({ id: z.string().uuid(), bookmark: z.boolean() });
export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ToggleInput.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("continuations")
      .update({ is_bookmarked: data.bookmark })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteContinuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => DeleteInput.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("continuations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
