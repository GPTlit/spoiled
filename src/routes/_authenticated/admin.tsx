import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListUsers,
  adminSetBanned,
  adminDeletePost,
  adminBroadcast,
} from "@/lib/admin.functions";
import { listGroups } from "@/lib/community.functions";
import { listFeed } from "@/lib/feed.functions";
import { adminDeleteGroup } from "@/lib/admin.functions";
import { listTheories, adminCreateTheory, adminUpdateTheory, adminDeleteTheory, type TheoryRow } from "@/lib/theories.functions";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — SPOILED" }] }),
});

function AdminPage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"users" | "posts" | "groups" | "theories" | "broadcast">("users");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/auth" }); return; }
      const { data: role } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setOk(!!role);
    })();
  }, [navigate]);

  if (ok === null) return <Loading />;
  if (!ok) return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Shield className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is restricted.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </div>
        <div className="mt-6 flex gap-2 border-b border-border">
          {(["users","posts","groups","theories","broadcast"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "users" && <UsersTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "groups" && <GroupsTab />}
          {tab === "theories" && <TheoriesTab />}
          {tab === "broadcast" && <BroadcastTab />}

        </div>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="min-h-screen"><SiteHeader /><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></div>;
}

function UsersTab() {
  const run = useServerFn(adminListUsers);
  const runBan = useServerFn(adminSetBanned);
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { run().then(setUsers); }, [run]);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-xs uppercase text-muted-foreground">
          <tr><th className="p-3 text-left">Username</th><th className="p-3 text-left">Display</th><th className="p-3 text-left">Joined</th><th className="p-3 text-right">Action</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-border">
              <td className="p-3 font-medium">@{u.username ?? "—"}</td>
              <td className="p-3 text-muted-foreground">{u.display_name ?? "—"}</td>
              <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="p-3 text-right">
                <button
                  onClick={async () => {
                    await runBan({ data: { userId: u.id, banned: !u.is_banned } });
                    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_banned: !u.is_banned } : x));
                    toast.success(u.is_banned ? "Unbanned" : "Banned");
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${u.is_banned ? "bg-verdant/25 text-verdant" : "bg-destructive/25 text-destructive"}`}
                >
                  {u.is_banned ? "Unban" : "Ban"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostsTab() {
  const run = useServerFn(listFeed);
  const runDel = useServerFn(adminDeletePost);
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { run({ data: { kind: "all" } }).then(setPosts); }, [run]);
  return (
    <div className="space-y-2">
      {posts.map((p) => (
        <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">@{p.author?.username ?? "user"} · {new Date(p.created_at).toLocaleString()}</div>
            <div className="mt-1 truncate text-sm">{p.title ?? p.caption ?? "(no text)"}</div>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Delete this post?")) return;
              await runDel({ data: { postId: p.id } });
              setPosts((prev) => prev.filter((x) => x.id !== p.id));
            }}
            className="rounded-full bg-destructive/25 px-3 py-1 text-xs font-semibold text-destructive"
          >Delete</button>
        </div>
      ))}
    </div>
  );
}

function GroupsTab() {
  const run = useServerFn(listGroups);
  const runDel = useServerFn(adminDeleteGroup);
  const [groups, setGroups] = useState<any[]>([]);
  useEffect(() => { run().then(setGroups); }, [run]);
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div>
            <div className="text-sm font-semibold">{g.name}</div>
            <div className="text-xs text-muted-foreground">{g.topic ?? "—"}</div>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Delete this group?")) return;
              await runDel({ data: { groupId: g.id } });
              setGroups((prev) => prev.filter((x) => x.id !== g.id));
            }}
            className="rounded-full bg-destructive/25 px-3 py-1 text-xs font-semibold text-destructive"
          >Delete</button>
        </div>
      ))}
    </div>
  );
}

function BroadcastTab() {
  const run = useServerFn(adminBroadcast);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-xl">
      <p className="mb-3 text-sm text-muted-foreground">Send a notification to every user.</p>
      <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} maxLength={400} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Your message..." />
      <button
        disabled={busy || !msg.trim()}
        onClick={async () => { setBusy(true); try { const r = await run({ data: { message: msg.trim() } }); toast.success(`Sent to ${r.sent} users.`); setMsg(""); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }}
        className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >Broadcast</button>
    </div>
  );
}
