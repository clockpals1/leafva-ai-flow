
-- App-wide key/value settings table for admin-configurable options
CREATE TABLE public.app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  is_secret   BOOLEAN NOT NULL DEFAULT false,
  category    TEXT    NOT NULL DEFAULT 'general',
  label       TEXT    NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can read/write settings
CREATE POLICY "authenticated can select settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated can insert settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- service_role bypasses RLS automatically (used by server-side supabaseAdmin)

-- Auto-update updated_at trigger
CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default/placeholder settings
INSERT INTO public.app_settings (key, value, is_secret, category, label, description) VALUES
  ('ai_api_key',       '',                                               true,  'ai',            'AI API Key',              'API key for your AI provider (Groq, OpenAI, Anthropic, Together AI, etc.)'),
  ('ai_gateway_url',   'https://api.groq.com/openai/v1/chat/completions', false, 'ai',            'AI Gateway URL',          'OpenAI-compatible /v1/chat/completions endpoint'),
  ('ai_model',         'llama-3.3-70b-versatile',                         false, 'ai',            'AI Model',                'Model identifier — Groq: llama-3.3-70b-versatile | OpenAI: gpt-4o | Anthropic: claude-3-5-sonnet'),
  ('ai_system_prompt', '',                                                           false, 'ai',            'Custom System Prompt',     'Overrides the built-in LEAFVA intake prompt. Leave blank to use the default.'),
  ('resend_api_key',   '',                                                           true,  'email',         'Resend API Key',           'API key from resend.com for sending transactional email'),
  ('resend_from_email','hello@leafva.com',                                           false, 'email',         'From Email',               'Sender address used on all outbound emails'),
  ('notification_email','',                                                          false, 'email',         'Admin Notification Email',  'Destination for internal alerts (new tickets, errors, etc.)'),
  ('notify_new_ticket','false',                                                      false, 'notifications', 'Notify on New Ticket',     'Send an email to the admin when a new ticket is created'),
  ('notify_ticket_update','false',                                                   false, 'notifications', 'Notify on Ticket Update',  'Send an email to the admin when a ticket status changes');
