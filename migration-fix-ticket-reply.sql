-- Migration: Fix admin ticket reply
-- The existing INSERT policy on ticket_messages was too restrictive for admins.
-- This adds a separate policy that explicitly allows admins to insert messages.
-- Run this in Supabase SQL Editor.

-- Add explicit admin INSERT policy for ticket_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert ticket messages') THEN
    CREATE POLICY "Admins can insert ticket messages" ON public.ticket_messages
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.user_id = auth.uid()
            AND (profiles.is_admin = TRUE OR profiles.role IN ('admin', 'owner'))
        )
      );
  END IF;
END $$;
