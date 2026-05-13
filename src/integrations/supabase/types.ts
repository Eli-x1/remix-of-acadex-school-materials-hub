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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          at: string
          details: string | null
          id: string
          school_id: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          at?: string
          details?: string | null
          id?: string
          school_id?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          at?: string
          details?: string | null
          id?: string
          school_id?: string | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          assigned_staff_ids: string[]
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          assigned_staff_ids?: string[]
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          assigned_staff_ids?: string[]
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          photo: string | null
          school_id: string | null
          staff_role_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          photo?: string | null
          school_id?: string | null
          staff_role_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          photo?: string | null
          school_id?: string | null
          staff_role_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
          user_label: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
          user_label?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
          user_label?: string | null
        }
        Relationships: []
      }
      school_classes: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["class_level"]
          school_id: string
          trade: string | null
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["class_level"]
          school_id: string
          trade?: string | null
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["class_level"]
          school_id?: string
          trade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          location: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          name?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          name: string
          parent_phone: string
          photo: string | null
          school_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          name: string
          parent_phone?: string
          photo?: string | null
          school_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_phone?: string
          photo?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      term_archives: {
        Row: {
          academic_year: number
          archived_at: string
          archived_by: string
          id: string
          materials_count: number
          school_id: string
          students_count: number
          summary: Json
          term: Database["public"]["Enums"]["term_code"]
          tracking: Json
        }
        Insert: {
          academic_year: number
          archived_at?: string
          archived_by?: string
          id?: string
          materials_count?: number
          school_id: string
          students_count?: number
          summary?: Json
          term: Database["public"]["Enums"]["term_code"]
          tracking?: Json
        }
        Update: {
          academic_year?: number
          archived_at?: string
          archived_by?: string
          id?: string
          materials_count?: number
          school_id?: string
          students_count?: number
          summary?: Json
          term?: Database["public"]["Enums"]["term_code"]
          tracking?: Json
        }
        Relationships: [
          {
            foreignKeyName: "term_archives_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking: {
        Row: {
          academic_year: number
          created_at: string
          id: string
          material_id: string
          promised_date: string | null
          school_id: string
          status: Database["public"]["Enums"]["tracking_status"]
          student_id: string
          term: Database["public"]["Enums"]["term_code"]
          updated_at: string
        }
        Insert: {
          academic_year: number
          created_at?: string
          id?: string
          material_id: string
          promised_date?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["tracking_status"]
          student_id: string
          term: Database["public"]["Enums"]["term_code"]
          updated_at?: string
        }
        Update: {
          academic_year?: number
          created_at?: string
          id?: string
          material_id?: string
          promised_date?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["tracking_status"]
          student_id?: string
          term?: Database["public"]["Enums"]["term_code"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_school_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "school_admin" | "staff"
      class_level: "L3" | "L4" | "L5" | "S1" | "S2" | "S3" | "S4" | "S5"
      term_code: "T1" | "T2" | "T3"
      tracking_status: "completed" | "pending" | "overdue"
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
      app_role: ["super_admin", "school_admin", "staff"],
      class_level: ["L3", "L4", "L5", "S1", "S2", "S3", "S4", "S5"],
      term_code: ["T1", "T2", "T3"],
      tracking_status: ["completed", "pending", "overdue"],
    },
  },
} as const
