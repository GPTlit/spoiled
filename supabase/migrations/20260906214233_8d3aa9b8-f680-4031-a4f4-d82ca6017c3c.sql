CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('grow-library-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grow-library-daily');

SELECT cron.schedule(
  'grow-library-daily',
  '17 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--fa0a87de-a976-4f85-af3b-cadd4780fec2.lovable.app/api/public/cron/grow-library',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','yh_6dqFKWbTrZe2LUO2qJmCcQa5RxKYbqOBKfN63CPnZhl3F'),
    body := '{}'::jsonb
  );
  $$
);