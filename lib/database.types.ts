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
      care_recipients: {
        Row: {
          birth_date: string | null
          created_at: string | null
          id: string
          name: string
          supporter_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name: string
          supporter_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          id?: string
          name?: string
          supporter_id?: string
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
          name: string
          protein_g: number | null
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
          name: string
          protein_g?: number | null
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
          name?: string
          protein_g?: number | null
        }
        Relationships: []
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
          recipient_id: string
          slot: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          recipient_id: string
          slot: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
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
      nutrition_snapshots: {
        Row: {
          date: string
          id: string
          meal_count: number | null
          recipient_id: string
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
