-- SALEM conversations
CREATE TABLE public.salem_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salem_conversations TO authenticated;
GRANT ALL ON public.salem_conversations TO service_role;
ALTER TABLE public.salem_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salem conv own" ON public.salem_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.salem_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.salem_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX salem_messages_conv_idx ON public.salem_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salem_messages TO authenticated;
GRANT ALL ON public.salem_messages TO service_role;
ALTER TABLE public.salem_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salem msg own" ON public.salem_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Screenwriter
CREATE TABLE public.sw_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  language text NOT NULL DEFAULT 'en',
  genre text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT '',
  logline text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT 'Screenplay',
  cover_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sw_projects TO authenticated;
GRANT SELECT ON public.sw_projects TO anon;
GRANT ALL ON public.sw_projects TO service_role;
ALTER TABLE public.sw_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sw projects own" ON public.sw_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sw projects public read" ON public.sw_projects FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE TABLE public.sw_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.sw_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_index integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sw_pages_project_idx ON public.sw_pages(project_id, page_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sw_pages TO authenticated;
GRANT SELECT ON public.sw_pages TO anon;
GRANT ALL ON public.sw_pages TO service_role;
ALTER TABLE public.sw_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sw pages own" ON public.sw_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sw pages public read" ON public.sw_pages FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.sw_projects p WHERE p.id = project_id AND p.is_public));

-- Show books
CREATE TABLE public.show_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_title text NOT NULL,
  service text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT 'Cinematic',
  language text NOT NULL DEFAULT 'en',
  season_from integer NOT NULL DEFAULT 1,
  season_to integer NOT NULL DEFAULT 1,
  cover_url text,
  content text NOT NULL DEFAULT '',
  credits text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.show_books TO authenticated;
GRANT SELECT ON public.show_books TO anon;
GRANT ALL ON public.show_books TO service_role;
ALTER TABLE public.show_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "show books own" ON public.show_books FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "show books public read" ON public.show_books FOR SELECT TO anon, authenticated USING (is_public = true);

-- Direct messages
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_threads_pair_unique UNIQUE (user_a, user_b),
  CONSTRAINT dm_threads_order CHECK (user_a < user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm threads participant read" ON public.dm_threads FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "dm threads participant insert" ON public.dm_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "dm threads participant update" ON public.dm_threads FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE OR REPLACE FUNCTION public.is_dm_participant(_thread uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = _thread AND (t.user_a = _user OR t.user_b = _user));
$$;

CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind message_kind NOT NULL DEFAULT 'text',
  content text,
  media_url text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dm_messages_thread_idx ON public.dm_messages(thread_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm msgs read participants" ON public.dm_messages FOR SELECT TO authenticated USING (public.is_dm_participant(thread_id, auth.uid()));
CREATE POLICY "dm msgs send participants" ON public.dm_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.is_dm_participant(thread_id, auth.uid()));
CREATE POLICY "dm msgs delete own" ON public.dm_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- Pins
CREATE TABLE public.conversation_pins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('group','dm')),
  ref_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, ref_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_pins TO authenticated;
GRANT ALL ON public.conversation_pins TO service_role;
ALTER TABLE public.conversation_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pins own" ON public.conversation_pins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Group activity ordering
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.bump_group_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.groups SET last_message_at = NEW.created_at WHERE id = NEW.group_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER group_messages_bump AFTER INSERT ON public.group_messages FOR EACH ROW EXECUTE FUNCTION public.bump_group_activity();

CREATE OR REPLACE FUNCTION public.bump_dm_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER dm_messages_bump AFTER INSERT ON public.dm_messages FOR EACH ROW EXECUTE FUNCTION public.bump_dm_activity();

CREATE TRIGGER sw_projects_updated BEFORE UPDATE ON public.sw_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sw_pages_updated BEFORE UPDATE ON public.sw_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER show_books_updated BEFORE UPDATE ON public.show_books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;