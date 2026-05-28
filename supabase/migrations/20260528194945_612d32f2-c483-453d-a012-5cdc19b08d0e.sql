
-- Tickets table for LEAFVA AI intake
CREATE TYPE public.ticket_urgency AS ENUM ('low','medium','high','emergency');
CREATE TYPE public.ticket_status AS ENUM ('new','triaged','in_progress','resolved','closed');

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL DEFAULT ('LV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  category TEXT,
  urgency public.ticket_urgency NOT NULL DEFAULT 'medium',
  summary TEXT,
  details TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.ticket_status NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'ai-assistant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tickets_created_at_idx ON public.tickets (created_at DESC);
CREATE INDEX tickets_status_idx ON public.tickets (status);

GRANT INSERT ON public.tickets TO anon, authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a ticket (public intake form)
CREATE POLICY "anon can insert tickets"
ON public.tickets FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- No public read/update/delete; only service_role (bypasses RLS) can read.
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
