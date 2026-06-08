-- Update backup-r2 pg_cron job to run 3x nightly (21h, 22h, 23h UTC).
-- Each run covers ~55s of files; 3 runs together ensure full coverage of
-- all 1 063 files (624 reports + 439 studies) even when each run times out.
--
-- Also resets the checkpoint so the first run starts from reports-files
-- (the most critical bucket, now first in QUERIES order).

do $$
begin
  -- Remove old single-run job
  if exists (select 1 from cron.job where jobname = 'backup-r2-nightly') then
    perform cron.unschedule('backup-r2-nightly');
  end if;

  -- Remove any previous 3x jobs in case this migration is re-run
  if exists (select 1 from cron.job where jobname = 'backup-r2-21h') then
    perform cron.unschedule('backup-r2-21h');
  end if;
  if exists (select 1 from cron.job where jobname = 'backup-r2-22h') then
    perform cron.unschedule('backup-r2-22h');
  end if;
  if exists (select 1 from cron.job where jobname = 'backup-r2-23h') then
    perform cron.unschedule('backup-r2-23h');
  end if;

  perform cron.schedule(
    'backup-r2-21h',
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

  perform cron.schedule(
    'backup-r2-22h',
    '0 22 * * *',
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

  perform cron.schedule(
    'backup-r2-23h',
    '0 23 * * *',
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

-- Reset checkpoint so next run starts from the top (reports-files first)
update backup_checkpoints
set    query_index = 0,
       query_offset = 0
where  id = 'singleton';
