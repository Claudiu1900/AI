-- ============================================
-- Migration: Add role system + email verification setting
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add 'role' column to profiles (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner'));
  END IF;
END $$;

-- Sync existing admins to admin role
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'user');

-- Add email verification setting (ignore if already exists)
INSERT INTO public.admin_settings (key, value, description) 
VALUES ('require_email_verification', '"true"', 'Whether new users must verify their email before logging in')
ON CONFLICT (key) DO NOTHING;

-- Update RLS policies for profiles to allow admins to update roles
-- (Admins can already modify profiles via existing policies, but let's make sure)
CREATE POLICY IF NOT EXISTS "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
