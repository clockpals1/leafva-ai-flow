
-- Harden function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Tighten public insert policy with basic input bounds
DROP POLICY "anon can insert tickets" ON public.tickets;

CREATE POLICY "public can submit tickets"
ON public.tickets FOR INSERT TO anon, authenticated
WITH CHECK (
  (name IS NULL OR char_length(name) <= 200)
  AND (email IS NULL OR char_length(email) <= 320)
  AND (phone IS NULL OR char_length(phone) <= 50)
  AND (company IS NULL OR char_length(company) <= 200)
  AND (category IS NULL OR char_length(category) <= 100)
  AND (summary IS NULL OR char_length(summary) <= 500)
  AND (details IS NULL OR char_length(details) <= 5000)
  AND source = 'ai-assistant'
);
