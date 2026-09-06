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
  adminListStories,
  adminUpdateStory,
  adminDeleteStory,
} from "@/lib/admin.functions";
import { adminAgent } from "@/lib/admin-ai.functions";
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
  const [tab, setTab] = useState<
    "operator" | "library" | "users" | "posts" | "groups" | "theories" | "stories" | "broadcast"
  >("operator");

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
          {(["operator","library","users","posts","groups","theories","stories","broadcast"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "operator" && <OperatorTab />}
          {tab === "users" && <UsersTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "groups" && <GroupsTab />}
          {tab === "theories" && <TheoriesTab />}
          {tab === "stories" && <StoriesTab />}
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

function TheoriesTab() {
  const run = useServerFn(listTheories);
  const runUpdate = useServerFn(adminUpdateTheory);
  const runCreate = useServerFn(adminCreateTheory);
  const runDelete = useServerFn(adminDeleteTheory);
  const [rows, setRows] = useState<TheoryRow[] | null>(null);
  const [editing, setEditing] = useState<Record<string, { title: string; body: string }>>({});
  const [newShow, setNewShow] = useState({ show_title: "", poster_url: "", title: "", body: "" });

  const refresh = () => run().then((d) => setRows(d as TheoryRow[]));
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [run]);

  if (!rows) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold">Add a theory</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={newShow.show_title} onChange={(e) => setNewShow({ ...newShow, show_title: e.target.value })} placeholder="Show title" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={newShow.poster_url} onChange={(e) => setNewShow({ ...newShow, poster_url: e.target.value })} placeholder="Poster URL (optional)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <input value={newShow.title} onChange={(e) => setNewShow({ ...newShow, title: e.target.value })} placeholder="Theory headline" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <textarea value={newShow.body} onChange={(e) => setNewShow({ ...newShow, body: e.target.value })} rows={3} placeholder="Theory body" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <button
          onClick={async () => {
            try {
              await runCreate({ data: { show_title: newShow.show_title, poster_url: newShow.poster_url || undefined, title: newShow.title, body: newShow.body } });
              setNewShow({ show_title: "", poster_url: "", title: "", body: "" });
              toast.success("Theory added.");
              refresh();
            } catch (e) { toast.error((e as Error).message); }
          }}
          disabled={!newShow.show_title.trim() || !newShow.title.trim() || newShow.body.trim().length < 5}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >Add theory</button>
      </div>

      <div className="space-y-3">
        {rows.map((t) => {
          const draft = editing[t.id] ?? { title: t.title, body: t.body };
          const dirty = draft.title !== t.title || draft.body !== t.body;
          return (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t.show_title}</div>
              <input
                value={draft.title}
                onChange={(e) => setEditing({ ...editing, [t.id]: { ...draft, title: e.target.value } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
              />
              <textarea
                value={draft.body}
                onChange={(e) => setEditing({ ...editing, [t.id]: { ...draft, body: e.target.value } })}
                rows={4}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex gap-2">
                <button
                  disabled={!dirty}
                  onClick={async () => {
                    try {
                      await runUpdate({ data: { id: t.id, title: draft.title, body: draft.body } });
                      toast.success("Saved.");
                      refresh();
                    } catch (e) { toast.error((e as Error).message); }
                  }}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >Save</button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this theory?")) return;
                    try { await runDelete({ data: { id: t.id } }); setRows((prev) => (prev ?? []).filter((x) => x.id !== t.id)); } catch (e) { toast.error((e as Error).message); }
                  }}
                  className="rounded-full bg-destructive/25 px-3 py-1 text-xs font-semibold text-destructive"
                >Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoriesTab() {
  const run = useServerFn(adminListStories);
  const runUpdate = useServerFn(adminUpdateStory);
  const runDelete = useServerFn(adminDeleteStory);
  const [rows, setRows] = useState<any[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { title: string; logline: string }>>({});
  const refresh = () => run().then((d) => setRows(d as any[]));
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [run]);

  if (!rows) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No stories yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((s) => {
        const d = draft[s.id] ?? { title: s.title ?? "", logline: s.logline ?? "" };
        const dirty = d.title !== (s.title ?? "") || d.logline !== (s.logline ?? "");
        return (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <input
              value={d.title}
              onChange={(e) => setDraft({ ...draft, [s.id]: { ...d, title: e.target.value } })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            />
            <textarea
              value={d.logline}
              rows={2}
              onChange={(e) => setDraft({ ...draft, [s.id]: { ...d, logline: e.target.value } })}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                disabled={!dirty}
                onClick={async () => {
                  try { await runUpdate({ data: { id: s.id, title: d.title, logline: d.logline } }); toast.success("Saved."); refresh(); }
                  catch (e) { toast.error((e as Error).message); }
                }}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >Save</button>
              <button
                onClick={async () => {
                  try { await runUpdate({ data: { id: s.id, is_public: !s.is_public } }); refresh(); }
                  catch (e) { toast.error((e as Error).message); }
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${s.is_public ? "bg-verdant/25 text-verdant" : "bg-muted text-muted-foreground"}`}
              >{s.is_public ? "Public" : "Private"}</button>
              <button
                onClick={async () => {
                  if (!confirm("Delete this story?")) return;
                  try { await runDelete({ data: { id: s.id } }); setRows((prev) => (prev ?? []).filter((x) => x.id !== s.id)); }
                  catch (e) { toast.error((e as Error).message); }
                }}
                className="rounded-full bg-destructive/25 px-3 py-1 text-xs font-semibold text-destructive"
              >Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OperatorTab() {
  const run = useServerFn(adminAgent);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    const history = msgs.slice(-10);
    setMsgs((m) => [...m, { role: "user", content: prompt }]);
    setBusy(true);
    try {
      const r = await run({ data: { prompt, history } });
      setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Your private control room. Tell it what to change and it changes the live site instantly — theories,
        story publishing, bans and announcements. It can also search the web for facts first.
      </p>
      <div className="min-h-[240px] space-y-3 rounded-xl border border-border bg-card p-4">
        {!msgs.length && (
          <p className="text-sm text-muted-foreground">
            Try: “Add three fresh theories for Severance”, “Unpublish the story called Ashfall”, or “Announce that
            Season 3 breakdowns are live”.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Working…</div>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Tell the operator what to change..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button onClick={send} disabled={busy || !input.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Send</button>
      </div>
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
