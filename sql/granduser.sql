-- 1) Enable pgcrypto (needed for crypt/gen_salt)
create extension if not exists pgcrypto;

-- 2) Create the grand user
insert into users (email, name, role, password_hash)
values (
  'granduser2@xreceipt.com',
  'Grand User 2',
  'grand_user',
  crypt('password1234', gen_salt('bf', 10))
)
on conflict (email) do update
set
  name = excluded.name,
  role = excluded.role,
  password_hash = excluded.password_hash;