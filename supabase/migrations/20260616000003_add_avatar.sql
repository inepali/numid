-- Add avatar columns to public.users table if they do not exist
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists avatar_updated_at timestamp with time zone;
