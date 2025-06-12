export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      intern_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          required_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          required_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          required_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_salary_history: {
        Row: {
          created_at: string
          id: string
          month: number
          total_hours: number
          total_salary: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          total_hours?: number
          total_salary?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          total_hours?: number
          total_salary?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          created_at: string
          data: string
          expires_at: string
          id: string
          is_used: boolean
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          data: string
          expires_at: string
          id?: string
          is_used?: boolean
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          log_type: string | null
          time_in: string | null
          time_out: string | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          log_type?: string | null
          time_in?: string | null
          time_out?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          log_type?: string | null
          time_in?: string | null
          time_out?: string | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_monthly_summary: {
        Args: {
          p_user_id: string
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      cleanup_logs_by_intern: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      cleanup_logs_by_intern_batched: {
        Args: {
          p_user_id: string
          p_batch_size?: number
        }
        Returns: Json
      }
      cleanup_logs_by_month: {
        Args: {
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      cleanup_logs_by_month_batched: {
        Args: {
          p_month: number
          p_year: number
          p_batch_size?: number
        }
        Returns: Json
      }
      create_qr_code: {
        Args: {
          qr_data: string
          expiry_seconds?: number
        }
        Returns: Json // JSON type instead of object
      }
      delete_manual_log: {
        Args: {
          p_log_id: string
        }
        Returns: Json
      }
      delete_multiple_logs: {
        Args: {
          p_log_ids: string[]
        }
        Returns: Json
      }
      get_monthly_log_breakdown: {
        Args: {
          p_user_id: string
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      validate_qr_code: {
        Args: {
          qr_data: string
        }
        Returns: Json // JSON type instead of object
      }
      use_qr_code: {
        Args: {
          qr_data: string
        }
        Returns: Json // JSON type instead of object
      }
      refresh_monthly_salary_history: {
        Args: {
          p_user_id: string
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      recalculate_all_salary_history: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_detailed_daily_logs: {
        Args: {
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          id: string
          date: string
          user_id: string
          intern_name: string
          time_in: string | null
          time_out: string | null
          total_hours: number | null
          log_type: string | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
