import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  getProject,
  savePages,
  updateProject,
  writeScene,
  generateArtwork,
} from "@/lib/studio.functions";
import { uploadMedia } from "@/lib/media-upload";
import { exportPdf } from "@/lib/pdf";
import {
  ArrowLeft, Loader2, Save, Sparkles, ImagePlus, Download, Globe, Lock,
  Plus, Trash2, ChevronLeft, ChevronRight, Wand2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio/$projectId")({
  component: StudioEditor,
  head: () => ({
    meta: [
      { title: "Manuscript — Screen Writer — SPOILED" },
      { name: "description", content: "Write, illustrate and export your screenplay or novel with SPOILED's AI screenwriting partner." },
      { property: "og:title", content: "Manuscript — Screen Writer" },
      { property: "og:description", content: "Write, illustrate and export your script." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Page = { id?: string; page_index: number; content: string; image_url?: string | null };
type Project = {
  id: string; title: string; logline: string; genre: string; tone: string; style: string;
  language: string; cover_url: string | null; is_public: boolean;
};

async function dataUrlToUploadedUrl(dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const { url } = await uploadMedia("studio-media", blob, "image", "png");
  return url;
}

function StudioEditor() {
  const { projectId } = useParams({ from: "/_authenticated/studio/$projectId" });
  const navigate = useNavigate();
  const runGet = useServerFn(getProject);
  const runSave = useServerFn(savePages);
  const runUpdate = useServerFn(updateProject);
  const runWrite = useServerFn(writeScene);
  const runArt = useServerFn(generateArtwork);

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [panel, setPanel] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [draft, setDraft] = useState("");
  const [writing, setWriting] = useState(false);
  const [arting, setArting] = useState<"cover" | "illustration" | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const pageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    runGet({ data: { id: projectId } })
      .then((res) => {
        const r = res as { project: Project; pages: Page[] };
        setProject(r.project);
        setPages(r.pages.length ? r.pages : [{ page_index: 0, content: "" }]);
      })
      .catch((e) => toast.error((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const current = pages[idx];
  const rtl = project?.language === "ar";

  const setContent = (v: string) => {
    setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, content: v } : p)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await runSave({ data: { projectId, pages: pages.map((p, i) => ({ ...p, page_index: i })) } });
      setDirty(false);
      toast.success("Saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const write = async () => {
    if (!instruction.trim()) return toast.error("Tell the writer what the scene should do.");
    setWriting(true);
    try {
      const res = await runWrite({
        data: { projectId, instruction, existing: pages.map((p) => p.content).join("\n\n"), targetLength: length },
      });
      setDraft((res as { text: string }).text);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWriting(false);
    }
  };

  const pushDraft = (mode: "append" | "newpage") => {
    if (!draft.trim()) return;
    if (mode === "append") {
      setContent(`${current.content}${current.content ? "\n\n" : ""}${draft}`);
    } else {
      setPages((prev) => [...prev, { page_index: prev.length, content: draft }]);
      setIdx(pages.length);
      setDirty(true);
    }
    setDraft("");
    toast.success("Added to the manuscript");
  };

  const makeArt = async (kind: "cover" | "illustration") => {
    const prompt = window.prompt(kind === "cover" ? "Describe the cover" : "Describe the illustration", project?.logline || "");
    if (!prompt) return;
    setArting(kind);
    try {
      const { dataUrl } = (await runArt({ data: { prompt, kind } })) as { dataUrl: string };
      const url = await dataUrlToUploadedUrl(dataUrl);
      if (kind === "cover") {
        await runUpdate({ data: { id: projectId, cover_url: url } });
        setProject((p) => (p ? { ...p, cover_url: url } : p));
      } else {
        setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, image_url: url } : p)));
        setDirty(true);
      }
      toast.success("Artwork added");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setArting(null);
    }
  };

  const uploadFor = async (file: File, kind: "cover" | "illustration") => {
    try {
      const { url } = await uploadMedia("studio-media", file, "image");
      if (kind === "cover") {
        await runUpdate({ data: { id: projectId, cover_url: url } });
        setProject((p) => (p ? { ...p, cover_url: url } : p));
      } else {
        setPages((prev) => prev.map((p, i) => (i === idx ? { ...p, image_url: url } : p)));
        setDirty(true);
      }
      toast.success("Image added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const togglePublic = async () => {
    if (!project) return;
    const next = !project.is_public;
    await runUpdate({ data: { id: projectId, is_public: next } });
    setProject({ ...project, is_public: next });
    if (next) {
      const url = `${window.location.origin}/stories/${projectId}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Published live — public link copied to your clipboard.");
      } catch {
        toast.success(`Published live at ${url}`);
      }
    } else {
      toast.success("Set to private");
    }
  };


  if (!project || !current) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background" dir={rtl ? "rtl" : "ltr"}>
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <button onClick={() => navigate({ to: "/studio" })} aria-label="Back" className="rounded-full p-2 hover:bg-card">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={project.title}
            onChange={(e) => setProject({ ...project, title: e.target.value })}
            onBlur={() => runUpdate({ data: { id: projectId, title: project.title } })}
            className="w-full truncate bg-transparent text-sm font-bold outline-none"
          />
          <div className="text-[11px] text-muted-foreground">{project.style} · {pages.length} page{pages.length > 1 ? "s" : ""}</div>
        </div>
        <button onClick={togglePublic} className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
          {project.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </button>
        <button
          onClick={() =>
            exportPdf({
              title: project.title,
              subtitle: project.logline,
              coverUrl: project.cover_url,
              pages: pages.map((p) => ({ content: p.content, imageUrl: p.image_url })),
              rtl,
            })
          }
          className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
          aria-label="Export PDF"
        >
          <Download className="h-4 w-4" />
        </button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {dirty ? "Save" : "Saved"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5 text-xs">
            <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="rounded p-1 disabled:opacity-30"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
            <span className="text-muted-foreground">Page {idx + 1} / {pages.length}</span>
            <button onClick={() => setIdx(Math.min(pages.length - 1, idx + 1))} disabled={idx >= pages.length - 1} className="rounded p-1 disabled:opacity-30"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button onClick={() => { setPages((p) => [...p, { page_index: p.length, content: "" }]); setIdx(pages.length); setDirty(true); }} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-card"><Plus className="h-3.5 w-3.5" /> Page</button>
            <button
              onClick={() => { if (pages.length === 1) return; setPages((p) => p.filter((_, i) => i !== idx)); setIdx(Math.max(0, idx - 1)); setDirty(true); }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:bg-card hover:text-destructive"
            ><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            <span className="mx-1 h-4 w-px bg-border" />
            <button onClick={() => pageInput.current?.click()} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-card"><ImagePlus className="h-3.5 w-3.5" /> Image</button>
            <button onClick={() => makeArt("illustration")} disabled={!!arting} className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-card disabled:opacity-50">
              {arting === "illustration" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Illustrate
            </button>
            <div className="ms-auto flex items-center gap-2">
              <button onClick={() => coverInput.current?.click()} className="rounded px-2 py-1 hover:bg-card">Upload cover</button>
              <button onClick={() => makeArt("cover")} disabled={!!arting} className="rounded px-2 py-1 hover:bg-card disabled:opacity-50">
                {arting === "cover" ? "Generating…" : "AI cover"}
              </button>
              <button onClick={() => setPanel((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> AI
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-3xl">
              {current.image_url && (
                <div className="relative mb-4">
                  <img src={current.image_url} alt="Page illustration" className="w-full rounded-xl object-cover" />
                  <button
                    onClick={() => { setPages((p) => p.map((x, i) => (i === idx ? { ...x, image_url: null } : x))); setDirty(true); }}
                    className="absolute end-2 top-2 rounded-full bg-background/80 p-1.5"
                    aria-label="Remove image"
                  ><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
              <textarea
                value={current.content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write here, or let the AI draft a scene and push it into the page…"
                className="min-h-[60vh] w-full resize-none bg-transparent font-serif text-[15px] leading-8 outline-none"
              />
            </div>
          </div>
        </main>

        {panel && (
          <aside className="flex w-full max-w-sm shrink-0 flex-col border-s border-border/60 bg-card/40">
            <div className="border-b border-border/60 p-3 text-sm font-semibold">AI writing room</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={5}
                placeholder="Key points, what the scene leads into, who changes, what stays unsaid…"
                className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex gap-1">
                {(["short", "medium", "long"] as const).map((l) => (
                  <button key={l} onClick={() => setLength(l)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs capitalize ${length === l ? "bg-primary text-primary-foreground" : "border border-border"}`}>{l}</button>
                ))}
              </div>
              <button onClick={write} disabled={writing} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Write the scene
              </button>

              {draft && (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-serif text-[13px] leading-7">{draft}</pre>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => pushDraft("append")} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground">Add to page</button>
                    <button onClick={() => pushDraft("newpage")} className="flex-1 rounded-lg border border-border py-1.5 text-xs">New page</button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(f, "cover"); e.target.value = ""; }} />
      <input ref={pageInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(f, "illustration"); e.target.value = ""; }} />
    </div>
  );
}
