import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listGroups, createGroup } from "@/lib/community.functions";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community — SPOILED" },
      { name: "description", content: "Fan groups, live discussion, theories in real time." },
    ],
  }),
});

type Group = { id: string; slug: string; name: string; topic: string | null; created_at: string };

function CommunityPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const runList = useServerFn(listGroups);

  const refresh = () => {
    runList().then((data) => {
      setGroups(data as Group[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Community</h1>
            <p className="mt-1 text-sm text-muted-foreground">Join a group chat, share shows, clips and theories with people who care as much as you do.</p>
          </div>
          {signedIn ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              <Plus className="h-4 w-4" /> New group
            </button>
          ) : (
            <Link to="/auth" search={{ next: "/community" }} className="rounded-xl border border-border bg-card px-4 py-2 text-sm hover:border-primary/60">
              Sign in to create
            </Link>
          )}
        </div>

        <Link
          to="/community/salem"
          className="mb-8 flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-5 transition hover:border-primary"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold">Talk to SALEM</div>
            <p className="text-xs text-muted-foreground">
              The AI who watched everything. Movies, shows, theories — and it'll spoil the ending on request.
            </p>
          </div>
        </Link>


        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
            No groups yet. Be the first to start one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                to="/community/$slug"
                params={{ slug: g.slug }}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/60"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="font-semibold">{g.name}</div>
                {g.topic && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.topic}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refresh(); }} />}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate();
  const run = useServerFn(createGroup);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await run({ data: { name, topic: topic || undefined } });
      toast.success("Group created.");
      onCreated();
      navigate({ to: "/community/$slug", params: { slug: res.slug } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-popover p-5"
      >
        <h2 className="text-lg font-semibold">Start a group</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} placeholder="Silo Theorists" className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={240} rows={3} placeholder="What's this group about?" className="w-full rounded-xl border border-border bg-card/60 px-4 py-3 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={busy || name.length < 2} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
          {busy ? "Creating..." : "Create group"}
        </button>
      </form>
    </div>
  );
}
