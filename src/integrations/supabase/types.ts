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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_datetime: string
          created_at: string | null
          doctor_name: string | null
          id: string
          location: string | null
          notes: string | null
          reminder_minutes_before: number | null
          specialty: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          appointment_datetime: string
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes_before?: number | null
          specialty?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          appointment_datetime?: string
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes_before?: number | null
          specialty?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_links: {
        Row: {
          caregiver_phone: string
          created_at: string | null
          id: string
          patient_id: string
          patient_name: string | null
        }
        Insert: {
          caregiver_phone: string
          created_at?: string | null
          id?: string
          patient_id: string
          patient_name?: string | null
        }
        Update: {
          caregiver_phone?: string
          created_at?: string | null
          id?: string
          patient_id?: string
          patient_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_notifications: {
        Row: {
          channel: string
          id: string
          message: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          channel: string
          id?: string
          message: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          id?: string
          message?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          color: string | null
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          mandatory_gap_minutes: number | null
          name: string
          notes: string | null
          times: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          mandatory_gap_minutes?: number | null
          name: string
          notes?: string | null
          times?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          mandatory_gap_minutes?: number | null
          name?: string
          notes?: string | null
          times?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          action: string
          action_at: string | null
          id: string
          notes: string | null
          reminder_id: string
          user_id: string
        }
        Insert: {
          action: string
          action_at?: string | null
          id?: string
          notes?: string | null
          reminder_id: string
          user_id: string
        }
        Update: {
          action?: string
          action_at?: string | null
          id?: string
          notes?: string | null
          reminder_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          id: string
          medication_id: string
          rescheduled_to: string | null
          retry_count: number | null
          scheduled_date: string
          scheduled_time: string
          status: string | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          medication_id: string
          rescheduled_to?: string | null
          retry_count?: number | null
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          medication_id?: string
          rescheduled_to?: string | null
          retry_count?: number | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age: number | null
          caregiver_email: string | null
          caregiver_fcm_token: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          caregiver_relationship: string | null
          created_at: string | null
          email: string | null
          fcm_token: string | null
          id: string
          name: string | null
          password: string | null
          phone: string | null
          phone_number: string | null
          role: string | null
          streak: number | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          caregiver_email?: string | null
          caregiver_fcm_token?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_relationship?: string | null
          created_at?: string | null
          email?: string | null
          fcm_token?: string | null
          id?: string
          name?: string | null
          password?: string | null
          phone?: string | null
          phone_number?: string | null
          role?: string | null
          streak?: number | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          caregiver_email?: string | null
          caregiver_fcm_token?: string | null
          caregiver_name?: string | null
          caregiver_phone?: string | null
          caregiver_relationship?: string | null
          created_at?: string | null
          email?: string | null
          fcm_token?: string | null
          id?: string
          name?: string | null
          password?: string | null
          phone?: string | null
          phone_number?: string | null
          role?: string | null
          streak?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_email: { Args: never; Returns: string }
      get_weekly_adherence: {
        Args: { p_user_id: string }
        Returns: {
          adherence_pct: number
          current_streak: number
          total_scheduled: number
          total_taken: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
