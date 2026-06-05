-- =============================================================================
-- LEAFVA Platform — Phase 1: Core Tables
-- =============================================================================
-- Extends the existing tickets table and adds all 12 platform tables.
-- Run AFTER the two prior migrations (tickets + app_settings).
-- =============================================================================

-- ── 1. NEW ENUMS ──────────────────────────────────────────────────────────────

CREATE TYPE public.staff_role AS ENUM (
  'admin', 'manager', 'technician', 'subcontractor'
);

CREATE TYPE public.ticket_priority AS ENUM (
  'routine', 'standard', 'high', 'critical'
);

CREATE TYPE public.remote_session_status AS ENUM (
  'pending', 'approved', 'active', 'completed', 'cancelled', 'denied'
);

-- Extend ticket_status with new workflow states
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'assigned'                  AFTER 'triaged';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting_customer'          AFTER 'assigned';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting_internal'          AFTER 'waiting_customer';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting_subcontractor'     AFTER 'waiting_internal';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'remote_session_active'     AFTER 'waiting_subcontractor';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'escalated'                 AFTER 'remote_session_active';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'reopened'                  AFTER 'resolved';


-- ── 2. STAFF ──────────────────────────────────────────────────────────────────

CREATE TABLE public.staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            public.staff_role NOT NULL DEFAULT 'technician',
  skills          TEXT[] NOT NULL DEFAULT '{}',
  is_available    BOOLEAN NOT NULL DEFAULT true,
  max_tickets     INT NOT NULL DEFAULT 10,
  timezone        TEXT DEFAULT 'America/Toronto',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX staff_user_id_idx    ON public.staff (user_id);
CREATE INDEX staff_role_idx       ON public.staff (role);
CREATE INDEX staff_available_idx  ON public.staff (is_available);

GRANT SELECT ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER staff_set_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 3. TICKET CATEGORIES ──────────────────────────────────────────────────────

CREATE TABLE public.ticket_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  color               TEXT NOT NULL DEFAULT '#22c55e',
  icon                TEXT,
  default_urgency     public.ticket_urgency NOT NULL DEFAULT 'medium',
  default_priority    public.ticket_priority NOT NULL DEFAULT 'standard',
  default_sla_hours   INT NOT NULL DEFAULT 24,
  auto_assign_skill   TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ticket_categories TO anon, authenticated;
GRANT ALL ON public.ticket_categories TO service_role;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER ticket_categories_set_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default categories
INSERT INTO public.ticket_categories (name, slug, color, default_urgency, default_sla_hours, auto_assign_skill) VALUES
  ('IT Support',           'it-support',           '#22c55e', 'medium',    24, 'it-support'),
  ('AI & Integrations',    'ai-integrations',      '#a78bfa', 'medium',    48, 'ai'),
  ('Networking',           'networking',            '#3b82f6', 'high',      12, 'networking'),
  ('System Administration','sys-admin',             '#f59e0b', 'medium',    24, 'sysadmin'),
  ('Custom Applications',  'custom-applications',  '#ec4899', 'medium',    72, 'development'),
  ('Full IT Project',      'it-project',            '#14b8a6', 'low',      120, NULL),
  ('Emergency / Outage',   'emergency-outage',     '#ef4444', 'emergency',  2, NULL),
  ('Other',                'other',                '#6b7280', 'low',        48, NULL);


-- ── 4. SLA POLICIES ──────────────────────────────────────────────────────────

CREATE TABLE public.sla_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  category_slug     TEXT,
  urgency           public.ticket_urgency,
  response_hours    INT NOT NULL DEFAULT 4,
  resolution_hours  INT NOT NULL DEFAULT 24,
  escalation_hours  INT,
  breach_action     TEXT DEFAULT 'notify',
  is_default        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sla_policies TO authenticated;
GRANT ALL ON public.sla_policies TO service_role;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sla_policies_set_updated_at
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default SLA policies
INSERT INTO public.sla_policies (name, urgency, response_hours, resolution_hours, escalation_hours, is_default) VALUES
  ('Emergency SLA',   'emergency', 1,  4,   2,    false),
  ('High SLA',        'high',      2,  8,   6,    false),
  ('Medium SLA',      'medium',    4,  24,  12,   false),
  ('Low SLA',         'low',       8,  72,  48,   false),
  ('Default SLA',     NULL,        4,  24,  12,   true);


-- ── 5. EXTEND EXISTING TICKETS TABLE ─────────────────────────────────────────

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS priority            public.ticket_priority NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS assigned_staff_id   UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_policy_id       UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_response_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolve_due_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_reason   TEXT,
  ADD COLUMN IF NOT EXISTS remote_eligible     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence       NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS resolution_summary  TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_minutes  INT,
  ADD COLUMN IF NOT EXISTS customer_rating     SMALLINT CHECK (customer_rating BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS tickets_assigned_staff_idx ON public.tickets (assigned_staff_id);
CREATE INDEX IF NOT EXISTS tickets_priority_idx       ON public.tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_escalated_idx      ON public.tickets (escalated) WHERE escalated = true;

-- Staff need read access (RLS policies will restrict to authorized rows)
GRANT SELECT, UPDATE ON public.tickets TO authenticated;


-- ── 6. TICKET ASSIGNMENTS (history) ─────────────────────────────────────────

CREATE TABLE public.ticket_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  staff_id          UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  assigned_by       UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  assignment_reason TEXT,
  ai_suggested      BOOLEAN NOT NULL DEFAULT false,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at     TIMESTAMPTZ
);

CREATE INDEX ticket_assignments_ticket_idx ON public.ticket_assignments (ticket_id);
CREATE INDEX ticket_assignments_staff_idx  ON public.ticket_assignments (staff_id);

GRANT SELECT, INSERT ON public.ticket_assignments TO authenticated;
GRANT ALL ON public.ticket_assignments TO service_role;
ALTER TABLE public.ticket_assignments ENABLE ROW LEVEL SECURITY;


-- ── 7. TICKET MESSAGES ───────────────────────────────────────────────────────

CREATE TABLE public.ticket_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  staff_id          UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  sender_name       TEXT,
  sender_email      TEXT,
  body              TEXT NOT NULL,
  is_internal       BOOLEAN NOT NULL DEFAULT false,
  is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  email_message_id  TEXT,
  attachments       JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages (ticket_id, created_at DESC);
CREATE INDEX ticket_messages_staff_idx  ON public.ticket_messages (staff_id);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER ticket_messages_set_updated_at
  BEFORE UPDATE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 8. TICKET FILES ──────────────────────────────────────────────────────────

CREATE TABLE public.ticket_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id    UUID REFERENCES public.ticket_messages(id) ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_files_ticket_idx ON public.ticket_files (ticket_id);

GRANT SELECT, INSERT ON public.ticket_files TO authenticated;
GRANT ALL ON public.ticket_files TO service_role;
ALTER TABLE public.ticket_files ENABLE ROW LEVEL SECURITY;


-- ── 9. TICKET HISTORY (audit trail) ─────────────────────────────────────────

CREATE TABLE public.ticket_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_history_ticket_idx ON public.ticket_history (ticket_id, created_at DESC);

GRANT SELECT, INSERT ON public.ticket_history TO authenticated;
GRANT ALL ON public.ticket_history TO service_role;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;


-- ── 10. REMOTE SESSIONS ──────────────────────────────────────────────────────

CREATE TABLE public.remote_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id                UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  requested_by             UUID NOT NULL REFERENCES public.staff(id),
  approved_by              UUID REFERENCES public.staff(id),
  customer_approval_token  TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  customer_approval_at     TIMESTAMPTZ,
  session_type             TEXT NOT NULL DEFAULT 'remote',
  session_tool             TEXT,
  session_url              TEXT,
  status                   public.remote_session_status NOT NULL DEFAULT 'pending',
  started_at               TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  duration_minutes         INT,
  session_notes            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX remote_sessions_ticket_idx ON public.remote_sessions (ticket_id);
CREATE INDEX remote_sessions_status_idx ON public.remote_sessions (status);

GRANT SELECT, INSERT ON public.remote_sessions TO authenticated;
GRANT ALL ON public.remote_sessions TO service_role;
ALTER TABLE public.remote_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER remote_sessions_set_updated_at
  BEFORE UPDATE ON public.remote_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 11. AI CLASSIFICATIONS ───────────────────────────────────────────────────

CREATE TABLE public.ai_classifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  category            TEXT,
  urgency             TEXT,
  sentiment           TEXT,
  suggested_team      TEXT,
  suggested_staff_id  UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  remote_likely       BOOLEAN NOT NULL DEFAULT false,
  confidence          NUMERIC(4,3),
  short_summary       TEXT,
  technical_summary   TEXT,
  customer_summary    TEXT,
  next_action         TEXT,
  key_actions         JSONB NOT NULL DEFAULT '[]',
  model_used          TEXT,
  raw_response        JSONB,
  was_accepted        BOOLEAN,
  feedback            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_classifications_ticket_idx ON public.ai_classifications (ticket_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_classifications TO authenticated;
GRANT ALL ON public.ai_classifications TO service_role;
ALTER TABLE public.ai_classifications ENABLE ROW LEVEL SECURITY;


-- ── 12. EMAIL THREADS ────────────────────────────────────────────────────────

CREATE TABLE public.email_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id    TEXT UNIQUE,
  in_reply_to   TEXT,
  subject       TEXT,
  from_email    TEXT,
  from_name     TEXT,
  to_emails     TEXT[] NOT NULL DEFAULT '{}',
  direction     TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body_html     TEXT,
  body_text     TEXT,
  resend_id     TEXT,
  status        TEXT NOT NULL DEFAULT 'sent',
  opened_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_threads_ticket_idx    ON public.email_threads (ticket_id, created_at DESC);
CREATE INDEX email_threads_from_idx      ON public.email_threads (from_email);

GRANT SELECT, INSERT ON public.email_threads TO authenticated;
GRANT ALL ON public.email_threads TO service_role;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;


-- ── 13. KNOWLEDGE SUGGESTIONS ────────────────────────────────────────────────

CREATE TABLE public.knowledge_suggestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,
  source           TEXT,
  source_id        UUID,
  relevance_score  NUMERIC(4,3),
  was_helpful      BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_suggestions_ticket_idx ON public.knowledge_suggestions (ticket_id);

GRANT SELECT, INSERT, UPDATE ON public.knowledge_suggestions TO authenticated;
GRANT ALL ON public.knowledge_suggestions TO service_role;
ALTER TABLE public.knowledge_suggestions ENABLE ROW LEVEL SECURITY;
