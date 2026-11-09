-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule hourly cleanup of old rate limit records
SELECT cron.schedule(
  'cleanup-sms-rate-limits-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tgxxuvwncpvtdnbrpezt.supabase.co/functions/v1/cleanup-rate-limits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneHh1dndqY3B2dGRuYnJwZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNDEzNjAsImV4cCI6MjA1MzcxNzM2MH0.fxFk5SkXlw-aQPCX-31B_srdlW0Ht8hqwfLVPRCZ0r0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);