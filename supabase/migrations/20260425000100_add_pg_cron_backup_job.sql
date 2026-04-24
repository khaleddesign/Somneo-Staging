-- Replaces the Vercel cron (/api/backup) with a pg_cron job that calls
-- the backup-r2 Edge Function directly via pg_net.
--
-- Why no service_role key: backup-r2 is deployed with verify_jwt = false,
-- so the Supabase gateway skips JWT validation. Only the CRON_SECRET is needed.
--
-- PREREQUISITE — run once in Supabase SQL Editor (never committed to git):
--
--   select vault.create_secret(
--     '9e536ee6c6e4bd2ce392d86839520444deb2c6545db8b9084d1fe151267b9179',
--     'backup_cron_secret',
--     'CRON_SECRET for pg_cron → backup-r2 Edge Function'
--   );
--
-- Verify with: select name, description from vault.secrets where name = 'backup_cron_secret';

create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- pg_cron on hosted Supabase requires these grants
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
begin
  -- Idempotent: drop and recreate so re-running the migration is safe
  if exists (select 1 from cron.job where jobname = 'backup-r2-nightly') then
    perform cron.unschedule('backup-r2-nightly');
  end if;

  perform cron.schedule(
    'backup-r2-nightly',
    '0 21 * * *',
    $job$
    select net.http_post(
      url     := 'https://wzvvdbbdnlhjqpydqvur.supabase.co/functions/v1/backup-r2',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from   vault.decrypted_secrets
          where  name = 'backup_cron_secret'
          limit  1
        )
      ),
      body    := '{}'::jsonb
    );
    $job$
  );
end $$;
