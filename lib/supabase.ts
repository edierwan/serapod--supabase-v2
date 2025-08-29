import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          code: string
          manufacturer_id: string
          product_id: string
          total_units: number
          status: string
          po_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          manufacturer_id: string
          product_id: string
          total_units: number
          status?: string
          po_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          manufacturer_id?: string
          product_id?: string
          total_units?: number
          status?: string
          po_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category_id: string
          brand_id: string
          price_cents: number
          image_url: string
          created_at: string
          updated_at: string
        }
      }
      manufacturers: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          address: string
          created_at: string
          updated_at: string
        }
      }
      batches: {
        Row: {
          id: string
          order_id: string
          product_id: string
          total_units: number
          buffer_units: number
          total_unique_qrs: number
          masters_count: number
          status: string
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
