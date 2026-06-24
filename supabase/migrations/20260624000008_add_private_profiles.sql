-- Add private_profiles JSONB column to public.users table if it does not exist
alter table public.users add column if not exists private_profiles jsonb default '[]'::jsonb not null;
