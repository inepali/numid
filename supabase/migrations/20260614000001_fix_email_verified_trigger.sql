-- Fix: on_auth_user_updated trigger was overwriting email_verified=true
-- with false whenever email_confirmed_at was NULL, which happened after
-- signInWithPassword session updates. Now the trigger only updates
-- destination_email when the actual email address changes, and only
-- sets email_verified=true (never resets it to false).

create or replace function public.handle_update_user_email()
returns trigger
security definer set search_path = public
as $$
begin
  -- Only sync destination_email if the email address itself changed
  if new.email is distinct from old.email then
    update public.users
    set
      destination_email = new.email,
      updated_at = timezone('utc'::text, now())
    where id = new.id;
  end if;

  -- Only promote email_verified to true — never reset it to false
  -- Do not verify if it's the default NumID domain email
  if new.email_confirmed_at is not null and new.email not like '%@numid.us' and new.email not like '%@numid.dev' then
    update public.users
    set
      email_verified = true,
      updated_at = timezone('utc'::text, now())
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql;
