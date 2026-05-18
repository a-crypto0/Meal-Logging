export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      care_recipients: {
        Row: {
          birth_date: string | null
          created_at: string | null
          id: string
          name: string
          repeat_warning_count: number | null
          repeat_warning_days: number | null
          supporter_id: string
          target_calories: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          target_fiber_g: number | null
          target_protein_g: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name: string
          repeat_warning_count?: number | null
          repeat_warning_days?: number | null
          supporter_id: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fiber_g?: number | null
          target_protein_g?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name?: string
          repeat_warning_count?: number | null
          repeat_warning_days?: number | null
          supporter_id?: string
          target_calories?: number | null
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_fiber_g?: number | null
          target_protein_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "care_recipients_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          calories_per_unit: number | null
          carbs_g: number | null
          category: string
          created_at: string | null
          default_unit: string
          emoji: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          is_custom: boolean | null
          name: string
          protein_g: number | null
          supporter_id: string | null
        }
        Insert: {
          calories_per_unit?: number | null
          carbs_g?: number | null
          category: string
          created_at?: string | null
          default_unit: string
          emoji: string
          fat_g?: number | null
          fiber_g?: number | null
          id: string
          is_custom?: boolean | null
          name: string
          protein_g?: number | null
          supporter_id?: string | null
        }
        Update: {
          calories_per_unit?: number | null
          carbs_g?: number | null
          category?: string
          created_at?: string | null
          default_unit?: string
          emoji?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          is_custom?: boolean | null
          name?: string
          protein_g?: number | null
          supporter_id?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          recipient_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          recipient_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          recipient_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_log_entries: {
        Row: {
          emoji: string
          food_id: string | null
          food_name: string
          id: string
          log_id: string
          logged_at: string | null
          quantity: number
          unit: string
        }
        Insert: {
          emoji: string
          food_id?: string | null
          food_name: string
          id?: string
          log_id: string
          logged_at?: string | null
          quantity?: number
          unit: string
        }
        Update: {
          emoji?: string
          food_id?: string | null
          food_name?: string
          id?: string
          log_id?: string
          logged_at?: string | null
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_entries_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          note: string | null
          recipient_id: string
          slot: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          note?: string | null
          recipient_id: string
          slot: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          recipient_id?: string
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          breakfast_time: string | null
          created_at: string | null
          dinner_time: string | null
          enabled: boolean | null
          id: string
          lunch_time: string | null
          recipient_id: string
          snack_time: string | null
          supporter_id: string
          updated_at: string | null
        }
        Insert: {
          breakfast_time?: string | null
          created_at?: string | null
          dinner_time?: string | null
          enabled?: boolean | null
          id?: string
          lunch_time?: string | null
          recipient_id: string
          snack_time?: string | null
          supporter_id: string
          updated_at?: string | null
        }
        Update: {
          breakfast_time?: string | null
          created_at?: string | null
          dinner_time?: string | null
          enabled?: boolean | null
          id?: string
          lunch_time?: string | null
          recipient_id?: string
          snack_time?: string | null
          supporter_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_snapshots: {
        Row: {
          date: string
          id: string
          meal_count: number | null
          recipient_id: string
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_fiber_g: number | null
          total_protein_g: number | null
          updated_at: string | null
        }
        Insert: {
          date: string
          id?: string
          meal_count?: number | null
          recipient_id: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
        }
        Update: {
          date?: string
          id?: string
          meal_count?: number | null
          recipient_id?: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_snapshots_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      share_tokens: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          label: string | null
          recipient_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          label?: string | null
          recipient_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          recipient_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_tokens_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      supporter_recipients: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          recipient_id: string
          role: string
          supporter_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          recipient_id: string
          role?: string
          supporter_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          recipient_id?: string
          role?: string
          supporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supporter_recipients_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supporter_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "care_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supporter_recipients_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "supporters"
            referencedColumns: ["id"]
          },
        ]
      }
      supporters: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_code: string }; Returns: Json }
      get_share_view: { Args: { p_token: string }; Returns: Json }
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
