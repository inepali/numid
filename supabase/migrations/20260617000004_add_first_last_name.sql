-- Add first_name and last_name text columns to public.users table if they do not exist
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
