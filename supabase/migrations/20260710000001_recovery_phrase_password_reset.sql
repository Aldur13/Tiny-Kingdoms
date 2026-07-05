-- Password reset without email. The project's email rate limit makes the
-- standard "send a reset link" flow impractical, so instead every account
-- sets a recovery phrase (checked like a password, hashed with pgcrypto —
-- pgcrypto was already enabled in 20260705000001_init_core_schema.sql) that
-- can be used to set a new password directly, no email round-trip at all.
-- Failed attempts are rate-limited per-account since this bypasses the
-- email-ownership check normal password resets rely on.

alter table public.profiles
  add column recovery_answer_hash text,
  add column recovery_failed_attempts int not null default 0,
  add column recovery_locked_until timestamptz;

-- Callable by a signed-in user to set/replace their own recovery phrase
-- (at signup, and any time after from Settings).
create or replace function public.set_recovery_phrase(p_recovery_phrase text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  if p_recovery_phrase is null or length(trim(p_recovery_phrase)) < 4 then
    raise exception 'recovery phrase must be at least 4 characters';
  end if;

  update public.profiles
  set
    recovery_answer_hash = crypt(trim(p_recovery_phrase), gen_salt('bf', 10)),
    recovery_failed_attempts = 0,
    recovery_locked_until = null
  where id = auth.uid();
end;
$$;

grant execute on function public.set_recovery_phrase(text) to authenticated;

-- Callable while signed out: proves account ownership via the recovery
-- phrase instead of an emailed link, then sets a new password directly on
-- auth.users. Rate-limited (5 attempts, then a 15-minute lock per account)
-- since a weak/guessed phrase is the only thing standing in the way.
create or replace function public.reset_password_with_recovery_phrase(
  p_email text,
  p_recovery_phrase text,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_hash text;
  v_locked_until timestamptz;
  v_failed int;
begin
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  select u.id, p.recovery_answer_hash, p.recovery_locked_until, p.recovery_failed_attempts
  into v_user_id, v_hash, v_locked_until, v_failed
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email));

  if not found then
    -- Same generic error as a bad phrase — don't reveal whether the email exists.
    perform pg_sleep(0.3);
    raise exception 'invalid email or recovery phrase';
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    raise exception 'too many attempts — try again later';
  end if;

  if v_hash is null or crypt(p_recovery_phrase, v_hash) <> v_hash then
    update public.profiles
    set
      recovery_failed_attempts = recovery_failed_attempts + 1,
      recovery_locked_until = case
        when recovery_failed_attempts + 1 >= 5 then now() + interval '15 minutes'
        else recovery_locked_until
      end
    where id = v_user_id;

    raise exception 'invalid email or recovery phrase';
  end if;

  update auth.users
  set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)), updated_at = now()
  where id = v_user_id;

  update public.profiles
  set recovery_failed_attempts = 0, recovery_locked_until = null
  where id = v_user_id;
end;
$$;

grant execute on function public.reset_password_with_recovery_phrase(text, text, text) to anon, authenticated;
