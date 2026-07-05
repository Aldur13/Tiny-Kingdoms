-- Schedules the global timer sweep every minute. This is purely an
-- optimization that keeps leaderboard/power_score fresh for *other*
-- players while a given player is offline; the active player's own client
-- always gets zero-latency resolution via sync_and_resolve_kingdom.

create extension if not exists pg_cron;

select cron.schedule(
  'resolve-finished-timers',
  '* * * * *',
  $$select public.resolve_finished_timers();$$
);
