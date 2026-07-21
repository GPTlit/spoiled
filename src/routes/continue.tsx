import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { mapSource, continueStory, askFollowup, type SourceMapping } from "@/lib/ai.functions";
import { saveContinuation } from "@/lib/library.functions";
import { STORY_MODES, SPOILER_LEVELS, FOLLOWUPS } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, BookOpen, Bookmark, ChevronRight, Compass, Loader2,
  MessageCircle, RefreshCw, Sparkles, TriangleAlert, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ q: z.string().catch("") });

export const Route = createFileRoute("/continue")({
  validateSearch: (s) => search.parse(s),
  component: ContinuePage,
});

type FollowUp = { q: string; a: string };

function ContinuePage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const runMap = useServerFn(mapSource);
  const runContinue = useServerFn(continueStory);
  const runFollow = useServerFn(askFollowup);
  const runSave = useServerFn(saveContinuation);

  const [mapping, setMapping] = useState<SourceMapping | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mode, setMode] = useState<(typeof STORY_MODES)[number]>("Cinematic");
  const [spoiler, setSpoiler] = useState(2);
  const [continuing, setContinuing] = useState(false);
  const [continuation, setContinuation] = useState<string | null>(null);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [followBusy, setFollowBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  useEffect(() => {
    if (!q) {
      navigate({ to: "/" });
      return;
    }
    setMapping(null);
    setContinuation(null);
    setFollowups([]);
    setSaved(false);
    setMapError(null);
    runMap({ data: { query: q } })
      .then((m) => setMapping(m as SourceMapping))
      .catch((e: Error) => setMapError(e.message));
  }, [q, navigate, runMap]);

  const onContinue = async () => {
    if (!mapping) return;
    setContinuing(true);
    setContinuation(null);
    setFollowups([]);
    setSaved(false);
    try {
      const res = await runContinue({
        data: { query: q, mapping, mode, spoilerLevel: spoiler },
      });
      setContinuation(res.content);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setContinuing(false);
    }
  };

  const onAsk = async (question: string) => {
    if (!mapping || !continuation) return;
    setFollowBusy(true);
    try {
      const res = await runFollow({
        data: { query: q, mapping, previous: continuation, question },
      });
      setFollowups((f) => [...f, { q: question, a: res.content }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFollowBusy(false);
    }
  };

  const onSave = async () => {
    if (!signedIn) {
      navigate({ to: "/auth", search: { next: `/continue?q=${encodeURIComponent(q)}` } });
      return;
    }
    if (!mapping || !continuation) return;
    try {
      await runSave({
        data: { query: q, mapping, mode, spoilerLevel: spoiler, content: continuation, bookmark: true },
      });
      setSaved(true);
      toast.success("Saved to your Library");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confidence = mapping?.confidence ?? 0;
  const confidenceColor = useMemo(() => {
    if (confidence >= 85) return "text-verdant";
    if (confidence >= 60) return "text-blush";
    return "text-destructive";
  }, [confidence]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          You watched
        </div>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">
          {q}
        </h1>

        {/* Mapping card */}
        <div className="mt-8">
          {!mapping && !mapError && <MappingSkeleton />}
          {mapError && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlert className="h-4 w-4" /> Couldn't map this yet
              </div>
              <p className="mt-1 text-muted-foreground">{mapError}</p>
              <button
                onClick={() => navigate({ to: "/" })}
                className="mt-3 text-xs underline underline-offset-4"
              >
                Try another search
              </button>
            </div>
          )}
          {mapping && (
            <div className="glass rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Mapped to
                  </div>
                  <div className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
                    {mapping.has_source ? mapping.source.title : "No published source"}
                  </div>
                  {mapping.has_source && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {mapping.source.part && (
                        <span className="mr-2">{mapping.source.part} ·</span>
                      )}
                      {mapping.location.approximate ? "≈ " : ""}
                      {mapping.location.chapter_or_section}
                    </div>
                  )}
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 text-[11px] uppercase tracking-wider text-secondary-foreground">
                    <BookOpen className="h-3 w-3" /> {mapping.source.type || mapping.input_type}
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Confidence
                  </div>
                  <div className={`font-display text-5xl ${confidenceColor}`}>
                    {confidence}%
                  </div>
                  <div className="mt-1 h-1 w-32 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, confidence)}%` }}
                    />
                  </div>
                </div>
              </div>

              {mapping.reasoning && (
                <p className="mt-6 text-sm text-muted-foreground">
                  <Compass className="mr-1 inline h-3 w-3 text-primary" /> {mapping.reasoning}
                </p>
              )}
              {mapping.differences && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-blush" /> {mapping.differences}
                </p>
              )}

              {/* Timeline mini */}
              <Timeline mapping={mapping} />

              {/* Mode + spoiler */}
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Story mode
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STORY_MODES.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          mode === m
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-card/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Spoiler scope
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SPOILER_LEVELS.map((s) => (
                      <button
                        key={s.level}
                        onClick={() => setSpoiler(s.level)}
                        className={`rounded-xl border p-3 text-left transition ${
                          spoiler === s.level
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card/40 hover:border-primary/50"
                        }`}
                      >
                        <div className="text-xs font-medium">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={onContinue}
                disabled={continuing}
                className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-display text-xl text-primary-foreground shadow-cinema transition hover:brightness-110 disabled:opacity-70 sm:text-2xl"
              >
                {continuing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Generating continuation…
                  </>
                ) : (
                  <>
                    Continue the Story
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Continuation output */}
        {continuation && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <Wand2 className="h-3 w-3 text-primary" /> {mode} · Level {spoiler}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onContinue}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <button
                  onClick={onSave}
                  disabled={saved}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs text-foreground hover:bg-primary/20 disabled:opacity-60"
                >
                  <Bookmark className="h-3 w-3" /> {saved ? "Saved" : "Save to Library"}
                </button>
              </div>
            </div>
            <article className="glass whitespace-pre-wrap rounded-3xl p-6 font-[450] leading-relaxed text-foreground/95 sm:p-10 sm:text-lg">
              {continuation}
            </article>

            {/* Follow-ups */}
            <div className="mt-8">
              <div className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <MessageCircle className="mr-1 inline h-3 w-3" /> Ask a follow-up
              </div>
              <div className="flex flex-wrap gap-2">
                {FOLLOWUPS.map((f) => (
                  <button
                    key={f}
                    disabled={followBusy}
                    onClick={() => onAsk(f)}
                    className="rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground disabled:opacity-50"
                  >
                    {f}
                  </button>
                ))}
              </div>
              {followBusy && (
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              )}
              <div className="mt-4 space-y-3">
                {followups.map((f, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card/40 p-5">
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <ChevronRight className="h-3 w-3" /> {f.q}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
                      {f.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mt-16 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Generated from public source material · Never invents facts
        </p>
      </div>
    </div>
  );
}

function MappingSkeleton() {
  return (
    <div className="glass rounded-3xl p-8">
      <div className="shimmer h-3 w-24 rounded-full bg-muted" />
      <div className="mt-4 shimmer h-10 w-2/3 rounded-lg bg-muted" />
      <div className="mt-3 shimmer h-3 w-1/2 rounded-full bg-muted" />
      <div className="mt-8 shimmer h-4 w-full rounded-full bg-muted" />
      <div className="mt-2 shimmer h-4 w-4/5 rounded-full bg-muted" />
    </div>
  );
}

function Timeline({ mapping }: { mapping: SourceMapping }) {
  const stops = [
    { label: "Where you stopped", sub: mapping.input_title || "Adaptation" },
    mapping.has_source
      ? { label: mapping.source.title, sub: mapping.location.chapter_or_section }
      : null,
    { label: "Continue here", sub: "→" },
  ].filter(Boolean) as { label: string; sub: string }[];
  return (
    <div className="mt-6 rounded-2xl border border-border/70 bg-background/40 p-4">
      <div className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Timeline
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {stops.map((s, i) => (
          <div key={i} className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 flex-col rounded-xl border border-border bg-card/60 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Stop {i + 1}
              </div>
              <div className="mt-1 text-sm font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
            {i < stops.length - 1 && (
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
