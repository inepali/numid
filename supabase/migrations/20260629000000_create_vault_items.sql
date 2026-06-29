-- Create updated_at trigger function if it does not exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create table for private vault items
create table if not exists public.vault_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  category text not null, -- 'ssn', 'driver_license', 'bank_account', 'password', 'passkey', 'other'
  title text not null, -- Plaintext description (e.g., "Chase Checking Account")
  encrypted_data text not null, -- AES-GCM ciphertext (containing encrypted JSON of sensitive values)
  iv text not null, -- Initialization vector used for encryption (hex/base64)
  salt text not null, -- Salt used to derive the PBKDF2 key (hex/base64)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.vault_items enable row level security;

-- Drop policy if exists
drop policy if exists "Users can manage their own vault items" on public.vault_items;

-- RLS Policy: Users can only manage their own vault items
create policy "Users can manage their own vault items"
  on public.vault_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Drop trigger if exists
drop trigger if exists set_vault_items_updated_at on public.vault_items;

-- Enable automatic updated_at timestamp trigger
create trigger set_vault_items_updated_at
  before update on public.vault_items
  for each row
  execute function public.handle_updated_at();
