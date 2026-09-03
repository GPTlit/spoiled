import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { exportPdf } from "@/lib/pdf";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/stories/$id")({
  component: StoryReader,
  head: () => ({
    meta: [
      { title: "Read a story — SPOILED" },
      { name: "description", content: "Read a screenplay or novel published by a SPOILED writer." },
      { property: "og:title", content: "Read a story — SPOILED" },
      { property: "og:description", content: "A screenplay or novel published by a SPOILED writer." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Project = { id: string; title: string; logline: string | null; genre: string | null; style: string | null; cover_url: string | null; language: string | null };
type Page = { id: string; page_index: number; content: string; image_url: string | null };

function StoryReader() {
  const { id } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: p } = await supabase
        .from("sw_projects")
        .select("id, title, logline, genre, style, cover_url, language")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      const { data: pg } = await supabase
        .from("sw_pages")
        .select("id, page_index, content, image_url")
        .eq("project_id", id)
        .order("page_index", { ascending: true });
      if (!alive) return;
      setProject((p as Project) ?? null);
      setPages((pg as Page[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const rtl = project?.language === "ar";

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!project) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">This story isn’t public</h1>
          <p className="mt-2 text-sm text-muted-foreground">The author may have set it back to private.</p>
          <Link to="/stories" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:border-primary/60">
            <ArrowLeft className="h-4 w-4" /> All stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6" dir={rtl ? "rtl" : "ltr"}>
        <Link to="/stories" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> All stories
        </Link>
        {project.cover_url && (
          <img src={project.cover_url} alt={`${project.title} cover`} className="mb-6 w-full rounded-2xl border border-border object-cover" />
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{project.title}</h1>
        <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          {project.style || "Story"}{project.genre ? ` · ${project.genre}` : ""}
        </div>
        {project.logline && <p className="mt-3 text-sm text-muted-foreground">{project.logline}</p>}

        <button
          onClick={() =>
            exportPdf({
              title: project.title,
              subtitle: project.logline ?? "",
              coverUrl: project.cover_url,
              pages: pages.map((p) => ({ content: p.content, imageUrl: p.image_url })),
              rtl: !!rtl,
            })
          }
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs hover:border-primary/60"
        >
          <Download className="h-3.5 w-3.5" /> Download PDF
        </button>

        <div className="mt-10 space-y-10">
          {pages.map((p) => (
            <section key={p.id}>
              {p.image_url && <img src={p.image_url} alt="" loading="lazy" className="mb-4 w-full rounded-xl border border-border" />}
              <div className="whitespace-pre-wrap text-[15px] leading-8">{p.content}</div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
