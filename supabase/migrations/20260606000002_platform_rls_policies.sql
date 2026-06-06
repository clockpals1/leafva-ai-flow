-- =============================================================================
-- LEAFVA Platform — Phase 1: RLS Policies
-- =============================================================================
-- All row-level security policies for the platform tables.
-- service_role bypasses RLS automatically (used by server API routes).
-- =============================================================================

-- ── HELPER: current user's staff role ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_staff_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT role::text FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns true if the current user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$;

-- Returns the current user's staff id
CREATE OR REPLACE FUNCTION public.my_staff_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns true if current user is assigned to a ticket
CREATE OR REPLACE FUNCTION public.is_assigned_to_ticket(p_ticket_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = p_ticket_id
      AND assigned_staff_id = public.my_staff_id()
  );
$$;


-- ── STAFF ─────────────────────────────────────────────────────────────────────
-- Any authenticated staff can read all staff profiles (needed for assignment UI)
-- Only admin/manager can insert/update staff records

CREATE POLICY "staff: all staff can read"
  ON public.staff FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "staff: admin/manager can insert"
  ON public.staff FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "staff: admin/manager can update"
  ON public.staff FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "staff: self can update own profile"
  ON public.staff FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ── TICKET CATEGORIES ─────────────────────────────────────────────────────────
-- Public read (needed in intake forms + AI assistant)
-- Only admin can write

CREATE POLICY "categories: anyone can read active"
  ON public.ticket_categories FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "categories: admin full access"
  ON public.ticket_categories FOR ALL TO authenticated
  USING (public.get_my_staff_role() = 'admin')
  WITH CHECK (public.get_my_staff_role() = 'admin');


-- ── SLA POLICIES ─────────────────────────────────────────────────────────────
-- Staff read; admin write

CREATE POLICY "sla: staff can read"
  ON public.sla_policies FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "sla: admin can write"
  ON public.sla_policies FOR ALL TO authenticated
  USING (public.get_my_staff_role() = 'admin')
  WITH CHECK (public.get_my_staff_role() = 'admin');


-- ── TICKETS ──────────────────────────────────────────────────────────────────
-- INSERT: public (authenticated) — keeps AI-assistant intake working
-- SELECT: admin/manager see all; technician/subcontractor see only assigned tickets
-- UPDATE: admin/manager all; technician only assigned tickets

CREATE POLICY "tickets: public can insert"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tickets: admin/manager read all"
  ON public.tickets FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "tickets: technician reads assigned"
  ON public.tickets FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND assigned_staff_id = public.my_staff_id()
  );

CREATE POLICY "tickets: admin/manager update all"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "tickets: technician updates assigned"
  ON public.tickets FOR UPDATE TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND assigned_staff_id = public.my_staff_id()
  )
  WITH CHECK (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND assigned_staff_id = public.my_staff_id()
  );


-- ── TICKET ASSIGNMENTS ───────────────────────────────────────────────────────
-- Read: admin/manager all; technician/subcontractor own rows
-- Insert: admin/manager only

CREATE POLICY "assignments: admin/manager read all"
  ON public.ticket_assignments FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "assignments: technician reads own"
  ON public.ticket_assignments FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND staff_id = public.my_staff_id()
  );

CREATE POLICY "assignments: admin/manager can insert"
  ON public.ticket_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "assignments: public can insert"
  ON public.ticket_assignments FOR INSERT TO authenticated
  WITH CHECK (true);


-- ── TICKET MESSAGES ──────────────────────────────────────────────────────────
-- Internal notes: only admin/manager/assigned technician can read
-- Customer-facing messages: same visibility as the ticket itself

CREATE POLICY "messages: admin/manager read all"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "messages: technician reads non-internal on assigned ticket"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() = 'technician'
    AND public.is_assigned_to_ticket(ticket_id)
    AND is_internal = false
  );

CREATE POLICY "messages: technician reads internal on assigned ticket"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() = 'technician'
    AND public.is_assigned_to_ticket(ticket_id)
    AND is_internal = true
  );

CREATE POLICY "messages: subcontractor reads non-internal on assigned"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() = 'subcontractor'
    AND public.is_assigned_to_ticket(ticket_id)
    AND is_internal = false
  );

CREATE POLICY "messages: staff can insert on accessible ticket"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "messages: public can insert"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (true);


-- ── TICKET FILES ─────────────────────────────────────────────────────────────

CREATE POLICY "files: admin/manager read all"
  ON public.ticket_files FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "files: technician/subcontractor read assigned"
  ON public.ticket_files FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "files: staff upload on accessible ticket"
  ON public.ticket_files FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "files: public can insert"
  ON public.ticket_files FOR INSERT TO authenticated
  WITH CHECK (true);


-- ── TICKET HISTORY ───────────────────────────────────────────────────────────
-- Full audit trail: admin/manager see all; others see their assigned ticket history

CREATE POLICY "history: admin/manager read all"
  ON public.ticket_history FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "history: technician reads assigned ticket history"
  ON public.ticket_history FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "history: staff can append to accessible ticket"
  ON public.ticket_history FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );


-- ── REMOTE SESSIONS ──────────────────────────────────────────────────────────
-- Only assigned technician or admin can request/view sessions
-- Subcontractors cannot initiate remote sessions

CREATE POLICY "remote: admin/manager read all"
  ON public.remote_sessions FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "remote: technician reads own sessions"
  ON public.remote_sessions FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() = 'technician'
    AND requested_by = public.my_staff_id()
  );

CREATE POLICY "remote: only assigned technician or admin can request"
  ON public.remote_sessions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR (
      public.get_my_staff_role() = 'technician'
      AND public.is_assigned_to_ticket(ticket_id)
      AND requested_by = public.my_staff_id()
    )
  );

CREATE POLICY "remote: admin/manager or session owner can update"
  ON public.remote_sessions FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_manager()
    OR requested_by = public.my_staff_id()
  )
  WITH CHECK (
    public.is_admin_or_manager()
    OR requested_by = public.my_staff_id()
  );


-- ── AI CLASSIFICATIONS ───────────────────────────────────────────────────────

CREATE POLICY "ai: admin/manager read all"
  ON public.ai_classifications FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "ai: technician reads assigned"
  ON public.ai_classifications FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "ai: staff can insert on accessible ticket"
  ON public.ai_classifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );


-- ── EMAIL THREADS ─────────────────────────────────────────────────────────────

CREATE POLICY "email: admin/manager read all"
  ON public.email_threads FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "email: technician reads assigned"
  ON public.email_threads FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "email: staff can insert"
  ON public.email_threads FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );


-- ── KNOWLEDGE SUGGESTIONS ────────────────────────────────────────────────────

CREATE POLICY "knowledge: admin/manager read all"
  ON public.knowledge_suggestions FOR SELECT TO authenticated
  USING (public.is_admin_or_manager());

CREATE POLICY "knowledge: technician reads assigned"
  ON public.knowledge_suggestions FOR SELECT TO authenticated
  USING (
    public.get_my_staff_role() IN ('technician', 'subcontractor')
    AND public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "knowledge: staff can insert"
  ON public.knowledge_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );

CREATE POLICY "knowledge: staff can update helpfulness"
  ON public.knowledge_suggestions FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  )
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_assigned_to_ticket(ticket_id)
  );
