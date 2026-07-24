import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listFeed } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "./feed";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/theories")({
  component: TheoriesPage,
  head: () => ({
    meta: [
      { title: "Theories — SPOILED" },
      { name: "description", content: "Fan theories, foreshadowing calls, and predictions." },
    ],
  }),
});

function TheoriesPage() {
  const runList = useServerFn(listFeed);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const refresh = () => runList({ data: { kind: "theory" } }).then((data) => { setPosts(data); setLoading(false); });

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Theories</h1>
        <p className="mt-1 text-sm text-muted-foreground">What did they hide in that frame? Post yours from the Feed.</p>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">No theories yet.</div>
        ) : (
          <div className="mt-6 space-y-4">
            {posts.map((p) => <PostCard key={p.id} p={p} signedIn={signedIn} onChange={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}
