-- Migration: Add tickets system for support/contact
-- Run this in Supabase SQL Editor

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,
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
        OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role IN ('admin', 'owner')))
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

-- If ticket_number column doesn't exist yet (table already created before this update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'ticket_number') THEN
    CREATE SEQUENCE IF NOT EXISTS tickets_ticket_number_seq;
    ALTER TABLE public.tickets ADD COLUMN ticket_number INTEGER UNIQUE DEFAULT nextval('tickets_ticket_number_seq');
    -- Backfill existing tickets
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM public.tickets
    )
    UPDATE public.tickets SET ticket_number = numbered.rn FROM numbered WHERE public.tickets.id = numbered.id;
  END IF;
END $$;

-- Admin delete policy for tickets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete tickets') THEN
    CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

-- Admin delete policy for ticket_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete ticket messages') THEN
    CREATE POLICY "Admins can delete ticket messages" ON public.ticket_messages FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

-- Admin insert policy for ticket_messages (so admins can reply)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create ticket messages') THEN
    CREATE POLICY "Admins can create ticket messages" ON public.ticket_messages FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND (is_admin = TRUE OR role = 'owner'))
    );
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
