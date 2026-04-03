-- =============================================
-- Supabase Storage: Create avatars bucket
-- Run this in the Supabase SQL Editor
-- =============================================

-- Create the avatars storage bucket (public, 2MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Allow anyone to read avatar files (they're public profile pics)
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update/overwrite avatars
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- =============================================
-- Add is_default column to ai_agents table
-- =============================================
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Ensure only one agent can be default at a time (optional constraint)
-- We'll handle this in application code instead

SELECT 'Done! Avatars bucket created & is_default column added.' as status;
