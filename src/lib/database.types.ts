export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          parent_id: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          parent_id?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          parent_id?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          filename: string
          pages: number
          status: 'pending' | 'processing' | 'completed'
          total_cost: number
          verification_code: string
          is_authenticated: boolean
          upload_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          filename: string
          pages?: number
          status?: 'pending' | 'processing' | 'completed'
          total_cost?: number
          verification_code?: string
          is_authenticated?: boolean
          upload_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          filename?: string
          pages?: number
          status?: 'pending' | 'processing' | 'completed'
          total_cost?: number
          verification_code?: string
          is_authenticated?: boolean
          upload_date?: string
          created_at?: string
          updated_at?: string
        }
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
  }
}