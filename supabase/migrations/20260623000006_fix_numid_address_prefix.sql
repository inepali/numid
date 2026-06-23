-- Update public.handle_new_user trigger to strip country code prefix '1' for US/Canada 10-digit numbers
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
declare
  raw_phone text;
  raw_role text;
  cleaned_phone text;
begin
  raw_phone := new.raw_user_meta_data->>'phone_number';
  raw_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  
  if raw_phone is null then
    raise exception 'phone_number metadata is required';
  end if;

  cleaned_phone := replace(raw_phone, '+', '');
  -- If it's a 11-digit number starting with 1, strip the leading 1 to keep the 10-digit local number
  if length(cleaned_phone) = 11 and substring(cleaned_phone from 1 for 1) = '1' then
    cleaned_phone := substring(cleaned_phone from 2);
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
    concat(cleaned_phone, '@numid.us'),
    false,
    false,
    'pending',
    raw_role
  );
  
  return new;
end;
$$ language plpgsql;

-- Update existing users to remove the country code prefix '1' from numid_address if it exists
update public.users
set numid_address = concat(substring(replace(phone_number, '+', '') from 2), '@numid.us')
where length(replace(phone_number, '+', '')) = 11 and substring(replace(phone_number, '+', '') from 1 for 1) = '1';
