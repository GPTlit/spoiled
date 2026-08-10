CREATE POLICY "salem media own" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'salem-media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'salem-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "studio media own" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'studio-media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'studio-media' AND auth.uid()::text = (storage.foldername(name))[1]);