export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: string | null
          is_secret: boolean
          category: string
          label: string
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value?: string | null
          is_secret?: boolean
          category?: string
          label?: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string | null
          is_secret?: boolean
          category?: string
          label?: string
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          ai_confidence: number | null
          assigned_staff_id: string | null
          category: string | null
          closed_at: string | null
          company: string | null
          created_at: string
          customer_rating: number | null
          details: string | null
          email: string | null
          escalated: boolean
          escalation_reason: string | null
          id: string
          name: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          reference: string
          remote_eligible: boolean
          resolution_minutes: number | null
          resolution_summary: string | null
          resolved_at: string | null
          sla_breached: boolean
          sla_policy_id: string | null
          sla_resolve_due_at: string | null
          sla_response_due_at: string | null
          source: string
          status: Database["public"]["Enums"]["ticket_status"]
          summary: string | null
          transcript: Json
          updated_at: string
          urgency: Database["public"]["Enums"]["ticket_urgency"]
        }
        Insert: {
          ai_confidence?: number | null
          assigned_staff_id?: string | null
          category?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          customer_rating?: number | null
          details?: string | null
          email?: string | null
          escalated?: boolean
          escalation_reason?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reference?: string
          remote_eligible?: boolean
          resolution_minutes?: number | null
          resolution_summary?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          sla_policy_id?: string | null
          sla_resolve_due_at?: string | null
          sla_response_due_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          summary?: string | null
          transcript?: Json
          updated_at?: string
          urgency?: Database["public"]["Enums"]["ticket_urgency"]
        }
        Update: {
          ai_confidence?: number | null
          assigned_staff_id?: string | null
          category?: string | null
          closed_at?: string | null
          company?: string | null
          created_at?: string
          customer_rating?: number | null
          details?: string | null
          email?: string | null
          escalated?: boolean
          escalation_reason?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reference?: string
          remote_eligible?: boolean
          resolution_minutes?: number | null
          resolution_summary?: string | null
          resolved_at?: string | null
          sla_breached?: boolean
          sla_policy_id?: string | null
          sla_resolve_due_at?: string | null
          sla_response_due_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          summary?: string | null
          transcript?: Json
          updated_at?: string
          urgency?: Database["public"]["Enums"]["ticket_urgency"]
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          phone: string | null
          avatar_url: string | null
          role: Database["public"]["Enums"]["staff_role"]
          skills: string[]
          is_available: boolean
          max_tickets: number
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          skills?: string[]
          is_available?: boolean
          max_tickets?: number
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          skills?: string[]
          is_available?: boolean
          max_tickets?: number
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string
          icon: string | null
          default_urgency: Database["public"]["Enums"]["ticket_urgency"]
          default_priority: Database["public"]["Enums"]["ticket_priority"]
          default_sla_hours: number
          auto_assign_skill: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string
          icon?: string | null
          default_urgency?: Database["public"]["Enums"]["ticket_urgency"]
          default_priority?: Database["public"]["Enums"]["ticket_priority"]
          default_sla_hours?: number
          auto_assign_skill?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          icon?: string | null
          default_urgency?: Database["public"]["Enums"]["ticket_urgency"]
          default_priority?: Database["public"]["Enums"]["ticket_priority"]
          default_sla_hours?: number
          auto_assign_skill?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          id: string
          name: string
          category_slug: string | null
          urgency: Database["public"]["Enums"]["ticket_urgency"] | null
          response_hours: number
          resolution_hours: number
          escalation_hours: number | null
          breach_action: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category_slug?: string | null
          urgency?: Database["public"]["Enums"]["ticket_urgency"] | null
          response_hours?: number
          resolution_hours?: number
          escalation_hours?: number | null
          breach_action?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_slug?: string | null
          urgency?: Database["public"]["Enums"]["ticket_urgency"] | null
          response_hours?: number
          resolution_hours?: number
          escalation_hours?: number | null
          breach_action?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_assignments: {
        Row: {
          id: string
          ticket_id: string
          staff_id: string
          assigned_by: string | null
          assignment_reason: string | null
          ai_suggested: boolean
          assigned_at: string
          unassigned_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          staff_id: string
          assigned_by?: string | null
          assignment_reason?: string | null
          ai_suggested?: boolean
          assigned_at?: string
          unassigned_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          staff_id?: string
          assigned_by?: string | null
          assignment_reason?: string | null
          ai_suggested?: boolean
          assigned_at?: string
          unassigned_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          staff_id: string | null
          sender_name: string | null
          sender_email: string | null
          body: string
          is_internal: boolean
          is_ai_generated: boolean
          email_message_id: string | null
          attachments: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          staff_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          body: string
          is_internal?: boolean
          is_ai_generated?: boolean
          email_message_id?: string | null
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          staff_id?: string | null
          sender_name?: string | null
          sender_email?: string | null
          body?: string
          is_internal?: boolean
          is_ai_generated?: boolean
          email_message_id?: string | null
          attachments?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_files: {
        Row: {
          id: string
          ticket_id: string
          message_id: string | null
          uploaded_by: string | null
          filename: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          message_id?: string | null
          uploaded_by?: string | null
          filename: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          message_id?: string | null
          uploaded_by?: string | null
          filename?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ticket_history: {
        Row: {
          id: string
          ticket_id: string
          staff_id: string | null
          action: string
          field_name: string | null
          old_value: string | null
          new_value: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          staff_id?: string | null
          action: string
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          staff_id?: string | null
          action?: string
          field_name?: string | null
          old_value?: string | null
          new_value?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      remote_sessions: {
        Row: {
          id: string
          ticket_id: string
          requested_by: string
          approved_by: string | null
          customer_approval_token: string | null
          customer_approval_at: string | null
          session_type: string
          session_tool: string | null
          session_url: string | null
          status: Database["public"]["Enums"]["remote_session_status"]
          started_at: string | null
          ended_at: string | null
          duration_minutes: number | null
          session_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          requested_by: string
          approved_by?: string | null
          customer_approval_token?: string | null
          customer_approval_at?: string | null
          session_type?: string
          session_tool?: string | null
          session_url?: string | null
          status?: Database["public"]["Enums"]["remote_session_status"]
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          session_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          requested_by?: string
          approved_by?: string | null
          customer_approval_token?: string | null
          customer_approval_at?: string | null
          session_type?: string
          session_tool?: string | null
          session_url?: string | null
          status?: Database["public"]["Enums"]["remote_session_status"]
          started_at?: string | null
          ended_at?: string | null
          duration_minutes?: number | null
          session_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_classifications: {
        Row: {
          id: string
          ticket_id: string
          category: string | null
          urgency: string | null
          sentiment: string | null
          suggested_team: string | null
          suggested_staff_id: string | null
          remote_likely: boolean
          confidence: number | null
          short_summary: string | null
          technical_summary: string | null
          customer_summary: string | null
          next_action: string | null
          key_actions: Json
          model_used: string | null
          raw_response: Json | null
          was_accepted: boolean | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          category?: string | null
          urgency?: string | null
          sentiment?: string | null
          suggested_team?: string | null
          suggested_staff_id?: string | null
          remote_likely?: boolean
          confidence?: number | null
          short_summary?: string | null
          technical_summary?: string | null
          customer_summary?: string | null
          next_action?: string | null
          key_actions?: Json
          model_used?: string | null
          raw_response?: Json | null
          was_accepted?: boolean | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          category?: string | null
          urgency?: string | null
          sentiment?: string | null
          suggested_team?: string | null
          suggested_staff_id?: string | null
          remote_likely?: boolean
          confidence?: number | null
          short_summary?: string | null
          technical_summary?: string | null
          customer_summary?: string | null
          next_action?: string | null
          key_actions?: Json
          model_used?: string | null
          raw_response?: Json | null
          was_accepted?: boolean | null
          feedback?: string | null
          created_at?: string
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          id: string
          ticket_id: string
          message_id: string | null
          in_reply_to: string | null
          subject: string | null
          from_email: string | null
          from_name: string | null
          to_emails: string[]
          direction: string
          body_html: string | null
          body_text: string | null
          resend_id: string | null
          status: string
          opened_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          message_id?: string | null
          in_reply_to?: string | null
          subject?: string | null
          from_email?: string | null
          from_name?: string | null
          to_emails?: string[]
          direction: string
          body_html?: string | null
          body_text?: string | null
          resend_id?: string | null
          status?: string
          opened_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          message_id?: string | null
          in_reply_to?: string | null
          subject?: string | null
          from_email?: string | null
          from_name?: string | null
          to_emails?: string[]
          direction?: string
          body_html?: string | null
          body_text?: string | null
          resend_id?: string | null
          status?: string
          opened_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      knowledge_suggestions: {
        Row: {
          id: string
          ticket_id: string
          title: string
          content: string | null
          source: string | null
          source_id: string | null
          relevance_score: number | null
          was_helpful: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          title: string
          content?: string | null
          source?: string | null
          source_id?: string | null
          relevance_score?: number | null
          was_helpful?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          title?: string
          content?: string | null
          source?: string | null
          source_id?: string | null
          relevance_score?: number | null
          was_helpful?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_staff_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin_or_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      my_staff_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      staff_role: "admin" | "manager" | "technician" | "subcontractor"
      ticket_priority: "routine" | "standard" | "high" | "critical"
      ticket_status: "new" | "triaged" | "assigned" | "in_progress" | "waiting_customer" | "waiting_internal" | "waiting_subcontractor" | "remote_session_active" | "escalated" | "resolved" | "reopened" | "closed"
      ticket_urgency: "low" | "medium" | "high" | "emergency"
      remote_session_status: "pending" | "approved" | "active" | "completed" | "cancelled" | "denied"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      staff_role: ["admin", "manager", "technician", "subcontractor"],
      ticket_priority: ["routine", "standard", "high", "critical"],
      ticket_status: [
        "new", "triaged", "assigned", "in_progress",
        "waiting_customer", "waiting_internal", "waiting_subcontractor",
        "remote_session_active", "escalated", "resolved", "reopened", "closed",
      ],
      ticket_urgency: ["low", "medium", "high", "emergency"],
      remote_session_status: ["pending", "approved", "active", "completed", "cancelled", "denied"],
    },
  },
} as const
