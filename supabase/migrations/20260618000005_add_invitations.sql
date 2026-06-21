-- Create public.invitations table
create table if not exists public.invitations (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.users(id) on delete cascade not null,
  phone_number text not null,
  email text not null,
  status text default 'pending' not null check (status in ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone
);

-- Enable Row Level Security (RLS) on invitations
alter table public.invitations enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own sent invitations" on public.invitations;
create policy "Users can view their own sent invitations"
  on public.invitations for select
  using (auth.uid() = sender_id or (select role from public.users where id = auth.uid()) = 'admin');

drop policy if exists "Users can create invitations" on public.invitations;
create policy "Users can create invitations"
  on public.invitations for insert
  with check (auth.uid() = sender_id or (select role from public.users where id = auth.uid()) = 'admin');

-- Index for lookup performance by id and status
create index if not exists invitations_id_status_idx on public.invitations(id, status);
