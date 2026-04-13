-- Seed file for local development
-- This creates a test user for development purposes

-- Insert test user into auth.users (for authentication)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '4d4f226e-3324-4680-936e-25c8e4aa41df',
  '00000000-0000-0000-0000-000000000000',
  'eyasir329@gmail.com',
  crypt('password123', gen_salt('bf')), -- password: password123
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test User"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Insert test user into public.users (for application data)
INSERT INTO public.users (
  id,
  email,
  full_name,
  account_status,
  status_changed_at,
  created_at,
  updated_at
) VALUES (
  '4d4f226e-3324-4680-936e-25c8e4aa41df',
  'eyasir329@gmail.com',
  'Test User',
  'active',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert platform handles for the test user
DO $$
DECLARE
  v_user_id UUID := '4d4f226e-3324-4680-936e-25c8e4aa41df';
  v_platform_id SMALLINT;
BEGIN
  -- Codeforces
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'codeforces';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- AtCoder
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'atcoder';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- LeetCode
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'leetcode';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- CodeChef
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'codechef';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- CSES
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'cses';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- Toph
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'toph';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- VJudge
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'vjudge';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- LightOJ
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'lightoj';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- UVA
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'uva';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- SPOJ
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'spoj';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- HackerRank
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'hackerrank';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;

  -- Beecrowd
  SELECT id INTO v_platform_id FROM platforms WHERE code = 'beecrowd';
  IF v_platform_id IS NOT NULL THEN
    INSERT INTO user_handles (user_id, platform_id, handle, is_verified, verified_at, sync_enabled, created_at, updated_at)
    VALUES (v_user_id, v_platform_id, 'eyasir329', true, NOW(), true, NOW(), NOW())
    ON CONFLICT (user_id, platform_id, handle) DO NOTHING;
  END IF;
END $$;
