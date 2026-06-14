-- Create public.users table
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  phone_number text unique not null,
  destination_email text not null,
  numid_address text unique not null,
  phone_verified boolean default false not null,
  email_verified boolean default false not null,
  cloudflare_route_id text,
  status text default 'pending' not null check (status in ('pending', 'active', 'disabled')),
  role text default 'user' not null check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users
alter table public.users enable row level security;

-- Create verification_logs table
create table if not exists public.verification_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text not null check (type in ('sms', 'email')),
  status text not null check (status in ('sent', 'verified', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on verification_logs
alter table public.verification_logs enable row level security;

-- Create audit_logs table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- Indexes for performance
create index if not exists users_phone_number_idx on public.users(phone_number);
create index if not exists users_numid_address_idx on public.users(numid_address);
create index if not exists verification_logs_user_id_type_idx on public.verification_logs(user_id, type);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);

-- Trigger: Automatically create public profile on auth.users signup
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
declare
  raw_phone text;
  raw_role text;
begin
  raw_phone := new.raw_user_meta_data->>'phone_number';
  raw_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  
  if raw_phone is null then
    raise exception 'phone_number metadata is required';
  end if;

  insert into public.users (
    id,
    phone_number,
    destination_email,
    numid_address,
    phone_verified,
    email_verified,
    status,
    role
  ) values (
    new.id,
    raw_phone,
    new.email,
    concat(replace(raw_phone, '+', ''), '@numid.us'),
    false,
    false,
    'pending',
    raw_role
  );
  
  return new;
end;
$$ language plpgsql;

-- Recreate trigger if exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: Update public profile email if auth.users email is verified or changed
create or replace function public.handle_update_user_email()
returns trigger
security definer set search_path = public
as $$
begin
  update public.users
  set 
    destination_email = new.email,
    email_verified = new.email_confirmed_at is not null,
    updated_at = timezone('utc'::text, now())
  where id = new.id;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, email_confirmed_at on auth.users
  for each row execute procedure public.handle_update_user_email();

-- RLS Policies

-- Users: Select
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id or (select role from public.users where id = auth.uid()) = 'admin');

-- Users: Update
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id or (select role from public.users where id = auth.uid()) = 'admin')
  with check (auth.uid() = id or (select role from public.users where id = auth.uid()) = 'admin');

-- Verification Logs: Select
create policy "Users can view their own verification logs"
  on public.verification_logs for select
  using (auth.uid() = user_id or (select role from public.users where id = auth.uid()) = 'admin');

-- Verification Logs: Insert
create policy "Users can insert verification logs"
  on public.verification_logs for insert
  with check (auth.uid() = user_id or (select role from public.users where id = auth.uid()) = 'admin');

-- Audit Logs: Select
create policy "Users can view their own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id or (select role from public.users where id = auth.uid()) = 'admin');

-- Audit Logs: Insert
create policy "Users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id or (select role from public.users where id = auth.uid()) = 'admin');
