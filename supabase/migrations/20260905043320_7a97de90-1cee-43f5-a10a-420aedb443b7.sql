CREATE TABLE IF NOT EXISTS public.catalog_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  year int,
  poster text,
  description text,
  genres text[] NOT NULL DEFAULT '{}',
  popularity numeric NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'show',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service, slug)
);

GRANT SELECT ON public.catalog_titles TO anon;
GRANT SELECT ON public.catalog_titles TO authenticated;
GRANT ALL ON public.catalog_titles TO service_role;

ALTER TABLE public.catalog_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_titles readable by anyone" ON public.catalog_titles FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  added int NOT NULL DEFAULT 0,
  scanned int NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_sync_runs TO authenticated;
GRANT ALL ON public.catalog_sync_runs TO service_role;

ALTER TABLE public.catalog_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync runs readable by admins" ON public.catalog_sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));