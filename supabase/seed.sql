-- Seed: Admin User
-- Jalankan di Supabase SQL Editor setelah schema.sql

-- Buat user admin dengan email & password sudah terverifikasi
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@kerjab.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Trigger on_auth_user_created sudah otomatis bikin profile dengan role 'karyawan'
-- Sekarang kita update jadi admin
UPDATE public.profiles
SET role = 'admin', name = 'Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@kerjab.com');
