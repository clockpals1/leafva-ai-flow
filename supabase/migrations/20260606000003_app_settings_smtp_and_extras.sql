-- Add SMTP email provider, extra AI controls, and extra notification settings
-- Safe to run multiple times (ON CONFLICT DO NOTHING)

INSERT INTO public.app_settings (key, value, is_secret, category, label, description) VALUES
  -- Email provider selector
  ('email_provider',        'resend',          false, 'email',         'Email Provider',                      'Active delivery method: "resend" or "smtp". Resend is used by default.'),

  -- SMTP settings
  ('smtp_host',             '',                false, 'smtp',          'SMTP Host',                           'SMTP server hostname — e.g. smtp.gmail.com · smtp-relay.brevo.com · smtp.mailgun.org'),
  ('smtp_port',             '587',             false, 'smtp',          'SMTP Port',                           '587 = STARTTLS (recommended) · 465 = SSL/TLS · 25 = plain (not recommended)'),
  ('smtp_secure',           'false',           false, 'smtp',          'Use SSL/TLS',                         'Enable for port 465 (implicit TLS). Leave disabled for port 587 (STARTTLS).'),
  ('smtp_user',             '',                false, 'smtp',          'SMTP Username',                       'Username or email address used to authenticate with the SMTP server'),
  ('smtp_password',         '',                true,  'smtp',          'SMTP Password',                       'Password or app-password for SMTP authentication (stored encrypted)'),
  ('smtp_from_email',       '',                false, 'smtp',          'From Email (SMTP)',                   'Sender address used on SMTP-delivered emails — must be authorised by your SMTP provider'),
  ('smtp_from_name',        'LEAFVA Support',  false, 'smtp',          'From Name (SMTP)',                    'Display name shown in the From field of SMTP emails'),

  -- Extra notification settings
  ('notify_status_change',  'false',           false, 'notifications', 'Email Customer on Status Change',     'Send an email to the customer when their ticket status is updated by staff'),
  ('notify_assignment',     'false',           false, 'notifications', 'Email Staff on Assignment',           'Send an email to a staff member when they are assigned to a ticket'),

  -- Extra AI controls
  ('ai_max_tokens',         '1024',            false, 'ai',            'Max Response Tokens',                 'Maximum tokens the AI may generate per response. Range: 128 – 8192.'),
  ('ai_temperature',        '0.4',             false, 'ai',            'AI Temperature',                      '0.0 = precise / deterministic · 1.0 = creative / varied. Recommended: 0.4'),
  ('ai_classify_auto',      'true',            false, 'ai',            'Auto-Classify New Tickets',           'Automatically run AI classification when a ticket is submitted via the assistant')

ON CONFLICT (key) DO NOTHING;
