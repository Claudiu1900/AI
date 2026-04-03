-- ============================================
-- Migration: Add role system + email verification setting
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add 'role' column to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner'));
  END IF;
END $$;

-- Step 2: Sync existing admins to admin role
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'user');

-- Step 3: Add email verification setting (ignore if already exists)
INSERT INTO public.admin_settings (key, value, description) 
VALUES ('require_email_verification', '"true"', 'Whether new users must verify their email before logging in')
ON CONFLICT (key) DO NOTHING;

-- Step 4: Allow admins to update all profiles (for role management)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can update all profiles" ON public.profiles
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;
