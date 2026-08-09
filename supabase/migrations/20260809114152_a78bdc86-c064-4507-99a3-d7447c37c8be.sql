CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.theories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_title text NOT NULL,
  show_slug text NOT NULL,
  poster_url text,
  show_summary text,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS theories_show_slug_idx ON public.theories (show_slug, sort_order);

GRANT SELECT ON public.theories TO anon;
GRANT SELECT ON public.theories TO authenticated;
GRANT ALL ON public.theories TO service_role;

ALTER TABLE public.theories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Theories are publicly readable" ON public.theories;
CREATE POLICY "Theories are publicly readable"
  ON public.theories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage theories" ON public.theories;
CREATE POLICY "Admins manage theories"
  ON public.theories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_theories_updated_at ON public.theories;
CREATE TRIGGER update_theories_updated_at
  BEFORE UPDATE ON public.theories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();