import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Admin-only: run the library growth now. */
export const growLibraryNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ pages: z.number().int().min(1).max(10).default(3) }).parse(v ?? {}))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { growLibrary } = await import("./catalog-sync.server");
    return growLibrary(data.pages);
  });

/** Admin-only: recent automatic library runs. */
export const listSyncRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("catalog_sync_runs")
      .select("id, added, scanned, note, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
