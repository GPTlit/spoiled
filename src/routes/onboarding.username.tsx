import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { setUsername } from "@/lib/profile.functions";
import { toast } from "sonner";

const search = z.object({ next: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/onboarding/username")({
  validateSearch: (s) => search.parse(s),
  component: Page,
  head: () => ({ meta: [{ title: "Pick a username — SPOILED" }] }),
});

function Page() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useServerFn(setUsername);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await run({ data: { username: name.trim() } });
      toast.success("Username saved.");
      navigate({ to: (next as "/") || "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Pick your username</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everyone on SPOILED needs a unique username. Letters, numbers, and underscores. 3–24 chars.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card/60 focus-within:border-primary">
            <span className="pl-4 text-muted-foreground">@</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              minLength={3}
              maxLength={24}
              required
              placeholder="yourname"
              className="w-full bg-transparent px-2 py-3 text-base outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy || name.length < 3}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-cinema hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
