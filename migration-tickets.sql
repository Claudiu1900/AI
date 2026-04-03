-- Migration: Add tickets system for support/contact
-- Run this in Supabase SQL Editor

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'question',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket messages table (for conversation threads)
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for tickets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own tickets') THEN
    CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create tickets') THEN
    CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all tickets') THEN
    CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update tickets') THEN
    CREATE POLICY "Admins can update tickets" ON public.tickets FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

-- Policies for ticket_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages for their tickets') THEN
    CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.tickets WHERE id = ticket_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create messages for their tickets') THEN
    CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages FOR INSERT WITH CHECK (
      auth.uid() = user_id
      AND (
        EXISTS (SELECT 1 FROM public.tickets WHERE id = ticket_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
      )
    );
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- Update timestamp trigger for tickets
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_ticket_updated_at') THEN
    CREATE TRIGGER update_ticket_updated_at
      BEFORE UPDATE ON public.tickets
      FOR EACH ROW EXECUTE FUNCTION update_ticket_timestamp();
  END IF;
END $$;
