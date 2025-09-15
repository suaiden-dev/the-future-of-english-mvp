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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          created_at: string | null
          file_id: string | null
          file_url: string | null
          filename: string
          folder_id: string | null
          id: string
          idioma_raiz: string | null
          is_authenticated: boolean | null
          is_bank_statement: boolean | null
          pages: number | null
          status: Database["public"]["Enums"]["document_status"] | null
          tipo_trad: string | null
          total_cost: number | null
          updated_at: string | null
          upload_date: string | null
          user_id: string
          valor: number | null
          verification_code: string | null
          client_name: string | null
          payment_method: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: string | null
          file_url?: string | null
          filename: string
          folder_id?: string | null
          id?: string
          idioma_raiz?: string | null
          is_authenticated?: boolean | null
          is_bank_statement?: boolean | null
          pages?: number | null
          status?: Database["public"]["Enums"]["document_status"] | null
          tipo_trad?: string | null
          total_cost?: number | null
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          valor?: number | null
          verification_code?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string | null
          file_url?: string | null
          filename?: string
          folder_id?: string | null
          id?: string
          idioma_raiz?: string | null
          is_authenticated?: boolean | null
          is_bank_statement?: boolean | null
          pages?: number | null
          status?: Database["public"]["Enums"]["document_status"] | null
          tipo_trad?: string | null
          total_cost?: number | null
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          valor?: number | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_to_be_verified: {
        Row: {
          authenticated_by: string | null
          authenticated_by_email: string | null
          authenticated_by_name: string | null
          authentication_date: string | null
          created_at: string | null
          file_id: string | null
          filename: string
          folder_id: string | null
          id: string
          is_authenticated: boolean | null
          is_bank_statement: boolean | null
          pages: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_comment: string | null
          rejection_reason: string | null
          source_language: string | null
          status: string
          target_language: string | null
          total_cost: number
          translated_file_url: string | null
          translation_status: string | null
          updated_at: string | null
          upload_date: string | null
          user_id: string
          verification_code: string | null
        }
        Insert: {
          authenticated_by?: string | null
          authenticated_by_email?: string | null
          authenticated_by_name?: string | null
          authentication_date?: string | null
          created_at?: string | null
          file_id?: string | null
          filename: string
          folder_id?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_bank_statement?: boolean | null
          pages?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_comment?: string | null
          rejection_reason?: string | null
          source_language?: string | null
          status?: string
          target_language?: string | null
          total_cost?: number
          translated_file_url?: string | null
          translation_status?: string | null
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          verification_code?: string | null
        }
        Update: {
          authenticated_by?: string | null
          authenticated_by_email?: string | null
          authenticated_by_name?: string | null
          authentication_date?: string | null
          created_at?: string | null
          file_id?: string | null
          filename?: string
          folder_id?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_bank_statement?: boolean | null
          pages?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_comment?: string | null
          rejection_reason?: string | null
          source_language?: string | null
          status?: string
          target_language?: string | null
          total_cost?: number
          translated_file_url?: string | null
          translation_status?: string | null
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_to_be_verified_authenticated_by_fkey"
            columns: ["authenticated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_to_be_verified_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_to_be_verified_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_to_be_verified_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          related_document_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          related_document_id?: string | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          related_document_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "auth_users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_sessions: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          metadata: Json | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          metadata?: Json | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          document_id: string
          user_id: string
          stripe_session_id: string | null
          amount: number
          currency: string
          status: string
          payment_method: string | null
          payment_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          user_id: string
          stripe_session_id?: string | null
          amount: number
          currency?: string
          payment_method?: string | null
          payment_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string
          stripe_session_id?: string | null
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          payment_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_to_be_verified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          report_type: string
          title: string
          description: string | null
          file_url: string | null
          generated_by: string | null
          parameters: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          report_type: string
          title: string
          description?: string | null
          file_url?: string | null
          generated_by?: string | null
          parameters?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          report_type?: string
          title?: string
          description?: string | null
          file_url?: string | null
          generated_by?: string | null
          parameters?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      translated_documents: {
        Row: {
          authenticated_by: string | null
          authenticated_by_email: string | null
          authenticated_by_name: string | null
          authentication_date: string | null
          created_at: string | null
          filename: string
          folder_id: string | null
          id: string
          is_authenticated: boolean | null
          is_deleted: boolean | null
          original_document_id: string
          pages: number | null
          source_language: string
          status: string
          target_language: string
          total_cost: number
          translated_file_url: string
          updated_at: string | null
          upload_date: string | null
          user_id: string
          verification_code: string
        }
        Insert: {
          authenticated_by?: string | null
          authenticated_by_email?: string | null
          authenticated_by_name?: string | null
          authentication_date?: string | null
          created_at?: string | null
          filename: string
          folder_id?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_deleted?: boolean | null
          original_document_id: string
          pages?: number | null
          source_language: string
          status?: string
          target_language: string
          total_cost?: number
          translated_file_url: string
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          verification_code: string
        }
        Update: {
          authenticated_by?: string | null
          authenticated_by_email?: string | null
          authenticated_by_name?: string | null
          authentication_date?: string | null
          created_at?: string | null
          filename?: string
          folder_id?: string | null
          id?: string
          is_authenticated?: boolean | null
          is_deleted?: boolean | null
          original_document_id?: string
          pages?: number | null
          source_language?: string
          status?: string
          target_language?: string
          total_cost?: number
          translated_file_url?: string
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "translated_documents_authenticated_by_fkey"
            columns: ["authenticated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translated_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translated_documents_original_document_id_fkey"
            columns: ["original_document_id"]
            isOneToOne: false
            referencedRelation: "documents_to_be_verified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translated_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      auth_users_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_file_accessibility: {
        Args: { file_path: string }
        Returns: boolean
      }
      debug_auth_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_role: string
          current_user_id: string
          current_user_role: string
          is_authenticated: boolean
        }[]
      }
      generate_permanent_public_url: {
        Args: { file_path: string }
        Returns: string
      }
      generate_verification_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_finance: {
        Args: { user_id?: string }
        Returns: boolean
      }
      get_payment_stats: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          total_payments: number
          total_amount: number
          completed_payments: number
          pending_payments: number
          failed_payments: number
        }[]
      }
      get_translation_stats: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          total_documents: number
          completed_translations: number
          pending_translations: number
          total_revenue: number
        }[]
      }
      get_enhanced_translation_stats: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          total_documents: number
          total_revenue: number
          user_uploads_total: number
          user_uploads_completed: number
          user_uploads_pending: number
          user_uploads_revenue: number
          authenticator_uploads_total: number
          authenticator_uploads_completed: number
          authenticator_uploads_pending: number
          authenticator_uploads_revenue: number
          total_completed: number
          total_pending: number
          total_rejected: number
        }[]
      }
      get_user_type_breakdown: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          user_type: string
          total_documents: number
          completed_documents: number
          pending_documents: number
          total_revenue: number
          avg_revenue_per_doc: number
        }[]
      }
      generate_payment_report: {
        Args: { report_type?: string; start_date?: string; end_date?: string }
        Returns: {
          document_id: string
          user_email: string
          amount: number
          status: string
          payment_date: string
          stripe_session_id: string
        }[]
      }
      debug_document_revenue: {
        Args: Record<string, never>
        Returns: {
          document_id: string
          user_id: string
          user_role: string
          filename: string
          status: string
          total_cost: number
          created_at: string
        }[]
      }
      check_total_cost_by_status: {
        Args: Record<string, never>
        Returns: {
          status: string
          document_count: number
          total_revenue: number
          avg_cost: number
          min_cost: number
          max_cost: number
        }[]
      }
      check_total_cost_by_role: {
        Args: Record<string, never>
        Returns: {
          user_role: string
          document_count: number
          total_revenue: number
          avg_cost: number
          min_cost: number
          max_cost: number
        }[]
      }
      analyze_document_types: {
        Args: Record<string, never>
        Returns: {
          document_count: number
          avg_pages: number
          status_distribution: string
          cost_range: string
        }[]
      }
      set_realistic_costs: {
        Args: Record<string, never>
        Returns: {
          updated_documents: number
          total_revenue: number
        }[]
      }
      set_role_based_costs: {
        Args: Record<string, never>
        Returns: {
          updated_documents: number
          user_revenue: number
          authenticator_revenue: number
        }[]
      }
    }
    Enums: {
      document_status: "pending" | "processing" | "completed"
      user_role: "user" | "admin" | "authenticator" | "finance"
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