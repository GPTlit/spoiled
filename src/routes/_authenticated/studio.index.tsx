import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { listProjects, createProject, deleteProject } from "@/lib/studio.functions";
import { Loader2, PenLine, Plus, Trash2, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio/")({
  component: StudioIndex,
  head: () => ({
    meta: [
      { title: "Screen Writer — SPOILED" },
      { name: "description", content: "Write your own film or series with an AI screenwriting partner: scenes, dialogue, pacing, covers and PDF export." },
      { property: "og:title", content: "Screen Writer — SPOILED" },
      { property: "og:description", content: "An AI screenwriting partner that follows your beats and fills the gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Project = Awaited<ReturnType<typeof listProjects>>[number];

const inputCls = "w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary";

const STYLES = ["Screenplay", "Novel", "Treatment", "Stage play"];

function StudioIndex() {
  const navigate = useNavigate();
  const run = useServerFn(listProjects);
  const runCreate = useServerFn(createProject);
  const runDelete = useServerFn(deleteProject);
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", logline: "", genre: "", tone: "", style: "Screenplay", language: "en" });

  const refresh = () => run().then((d) => { setItems(d as Project[]); setLoading(false); });
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const create = async () => {
    setBusy(true);
    try {
      const row = await runCreate({ data: { ...form, title: form.title || "Untitled" } });
      navigate({ to: "/studio/$projectId", params: { projectId: (row as { id: string }).id } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Screen Writer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Give it your key points, tone and scene lengths — it fills the gaps with action, dialogue and pacing.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
            <Plus className="h-4 w-4" /> New project
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
            <PenLine className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">No projects yet. Start your first script.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50">
                <Link to="/studio/$projectId" params={{ projectId: p.id }} className="block">
                  <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={`${p.title} cover`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground"><PenLine className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate font-semibold">{p.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {p.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      <span className="truncate">{p.style} · {p.genre || "—"}</span>
                    </div>
                  </div>
                </Link>
                <button
                  aria-label="Delete project"
                  onClick={async () => {
                    if (!confirm(`Delete "${p.title}"?`)) return;
                    await runDelete({ data: { id: p.id } });
                    setItems((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">New project</h2>
            <div className="mt-4 space-y-3">
              <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Untitled" /></Field>
              <Field label="Logline"><textarea value={form.logline} onChange={(e) => setForm({ ...form, logline: e.target.value })} rows={2} className={inputCls} placeholder="A hitman with amnesia..." /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Genre"><input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className={inputCls} placeholder="Thriller" /></Field>
                <Field label="Tone"><input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className={inputCls} placeholder="Bleak, funny" /></Field>
                <Field label="Format">
                  <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} className={inputCls}>
                    {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Language">
                  <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="fr">Français</option>
                  </select>
                </Field>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
              <button disabled={busy} onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
