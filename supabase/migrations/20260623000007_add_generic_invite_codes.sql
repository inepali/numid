-- Add code column to invitations table to support custom alphanumeric invite codes (e.g. BETATESTERS)
alter table public.invitations add column if not exists code text unique;
