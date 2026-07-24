
CREATE POLICY "chat-media auth read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('chat-media','feed-media'));
CREATE POLICY "chat-media auth insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('chat-media','feed-media') AND owner = auth.uid());
CREATE POLICY "chat-media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('chat-media','feed-media') AND owner = auth.uid());
