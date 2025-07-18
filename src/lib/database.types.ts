export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
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
          pages: number
          status: string
          tipo_trad: string | null
          total_cost: number
          updated_at: string | null
          upload_date: string | null
          user_id: string
          valor: number | null
          verification_code: string
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
          pages?: number
          status?: string
          tipo_trad?: string | null
          total_cost?: number
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
          valor?: number | null
          verification_code: string
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
          pages?: number
          status?: string
          tipo_trad?: string | null
          total_cost?: number
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
          valor?: number | null
          verification_code?: string
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
            foreignKeyName: "documentos_a_serem_verificados_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_a_serem_verificados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_to_be_verified_authenticated_by_fkey"
            columns: ["authenticated_by"]
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
          is_read: boolean | null
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
          is_read?: boolean | null
          message: string
          related_document_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
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
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "documentos_traduzidos_documento_original_id_fkey"
            columns: ["original_document_id"]
            isOneToOne: false
            referencedRelation: "documents_to_be_verified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_traduzidos_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_traduzidos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "translated_documents_authenticated_by_fkey"
            columns: ["authenticated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_verification_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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