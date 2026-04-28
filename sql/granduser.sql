-- Enable pgcrypto (needed for crypt/gen_salt)
create extension if not exists pgcrypto;

-- Create (or update) the grand user
insert into users (email, name, role, password_hash, status)
values (
  'grandsuer@receipt.com',
  'Grand User',
  'grand_user',
  crypt('Password1234', gen_salt('bf', 10)),
  'active'
)
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  status = excluded.status,
  password_hash = excluded.password_hash,
  updated_at = now();