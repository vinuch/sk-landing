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
      MenuItems: {
        Row: {
          created_at: string
          id: number
          name: string | null
          price: number | null
          type: Database["public"]["Enums"]["Food_type"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          price?: number | null
          type?: Database["public"]["Enums"]["Food_type"] | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          price?: number | null
          type?: Database["public"]["Enums"]["Food_type"] | null
        }
        Relationships: []
      }
      OrderItems: {
        Row: {
          created_at: string
          id: number
          item_name: string | null
          line_total: number | null
          menu_item_id: number | null
          order_id: number | null
          product_ref: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          item_name?: string | null
          line_total?: number | null
          menu_item_id?: number | null
          order_id?: number | null
          product_ref?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          item_name?: string | null
          line_total?: number | null
          menu_item_id?: number | null
          order_id?: number | null
          product_ref?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "OrderItems_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "MenuItems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItems_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "Orders"
            referencedColumns: ["id"]
          },
        ]
      }
      Orders: {
        Row: {
          bank_receipt_url: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee: number | null
          delivery_id: string | null
          delivery_instructions: string | null
          delivery_status: Database["public"]["Enums"]["Delivery_status"] | null
          delivery_tracking: string | null
          id: number
          items_subtotal: number | null
          order_notes: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: boolean | null
          rider_name: string | null
          rider_phone: string | null
          total_amount: number | null
          tracking_url: string | null
          user_id: string | null
          vendor_instructions: string | null
        }
        Insert: {
          bank_receipt_url?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_id?: string | null
          delivery_instructions?: string | null
          delivery_status?: Database["public"]["Enums"]["Delivery_status"] | null
          delivery_tracking?: string | null
          id?: number
          items_subtotal?: number | null
          order_notes?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: boolean | null
          rider_name?: string | null
          rider_phone?: string | null
          total_amount?: number | null
          tracking_url?: string | null
          user_id?: string | null
          vendor_instructions?: string | null
        }
        Update: {
          bank_receipt_url?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_id?: string | null
          delivery_instructions?: string | null
          delivery_status?: Database["public"]["Enums"]["Delivery_status"] | null
          delivery_tracking?: string | null
          id?: number
          items_subtotal?: number | null
          order_notes?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: boolean | null
          rider_name?: string | null
          rider_phone?: string | null
          total_amount?: number | null
          tracking_url?: string | null
          user_id?: string | null
          vendor_instructions?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: number
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: number
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: number
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      ContactInquiries: {
        Row: {
          created_at: string
          id: number
          inquiry_other: string | null
          inquiry_type: string
          message: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: number
          inquiry_other?: string | null
          inquiry_type: string
          message: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: number
          inquiry_other?: string | null
          inquiry_type?: string
          message?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          amount_kobo: number
          cart_snapshot: Json | null
          created_at: string
          currency: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          expires_at: string | null
          id: number
          items_subtotal: number | null
          order_id: number | null
          paid_at: string | null
          payment_method: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string
          vendor_instructions: string | null
        }
        Insert: {
          amount_kobo: number
          cart_snapshot?: Json | null
          created_at?: string
          currency?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          expires_at?: string | null
          id?: number
          items_subtotal?: number | null
          order_id?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
          vendor_instructions?: string | null
        }
        Update: {
          amount_kobo?: number
          cart_snapshot?: Json | null
          created_at?: string
          currency?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          expires_at?: string | null
          id?: number
          items_subtotal?: number | null
          order_id?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
          vendor_instructions?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          onboarded: boolean | null
          phone: string | null
        }
        Insert: {
          full_name?: string | null
          id: string
          onboarded?: boolean | null
          phone?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string
          onboarded?: boolean | null
          phone?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          user_id?: string
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
      Delivery_status: "pending" | "awaiting_confirmation" | "confirmed" | "preparing" | "ready" | "rider_arrived" | "rider_left" | "delivered"
      Food_type: "soup" | "swallow" | "protein"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
