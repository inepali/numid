-- Seed SQL Script for NumID MVP
-- Open the Supabase SQL Editor and execute this script to seed two fully verified test users:
-- 1. Regular User: sanjaya.ghimire@gmail.com / Password: password123
-- 2. Admin User: admin@numid.dev / Password: password123

-- Enable pgcrypto extension for password encryption
create extension if not exists pgcrypto;

do $$
declare
  user_id_1 uuid := '11111111-1111-1111-1111-111111111111';
  admin_id_2 uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- 1. Seed Regular User
  if not exists (select 1 from auth.users where id = user_id_1) then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) values (
      user_id_1,
      '00000000-0000-0000-0000-000000000000',
      'sanjaya.ghimire@gmail.com',
      crypt('password123', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"phone_number":"+15154146054","role":"user"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    -- The trigger public.on_auth_user_created will automatically create the row in public.users.
    -- We update the seeded user to a fully active status for testing:
    update public.users
    set 
      phone_verified = true,
      email_verified = true,
      status = 'active',
      cloudflare_route_id = 'cf-rule-seeded-user'
    where id = user_id_1;

    -- Add a log into audit trail
    insert into public.audit_logs (user_id, action, metadata)
    values (user_id_1, 'account_seeded', '{"type":"regular_user"}'::jsonb);
  end if;

  -- 2. Seed Admin User
  if not exists (select 1 from auth.users where id = admin_id_2) then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) values (
      admin_id_2,
      '00000000-0000-0000-0000-000000000000',
      'admin@numid.dev',
      crypt('password123', gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"phone_number":"+19999999999","role":"admin"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    );

    -- The trigger automatically creates public.users row with role='admin'.
    -- We update verified fields to make it active:
    update public.users
    set 
      phone_verified = true,
      email_verified = true,
      status = 'active',
      role = 'admin'
    where id = admin_id_2;

    insert into public.audit_logs (user_id, action, metadata)
    values (admin_id_2, 'account_seeded', '{"type":"admin_user"}'::jsonb);
  end if;
end $$;
