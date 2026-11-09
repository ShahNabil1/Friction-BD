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
      abandoned_checkouts: {
        Row: {
          address_details: Json | null
          cart_items: Json | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          phone: string | null
          recovered_at: string | null
          session_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_details?: Json | null
          cart_items?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          phone?: string | null
          recovered_at?: string | null
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_details?: Json | null
          cart_items?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          phone?: string | null
          recovered_at?: string | null
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          action_type: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          image_url_optimized: string | null
          is_featured: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_optimized?: string | null
          is_featured?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          image_url_optimized?: string | null
          is_featured?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      courier_webhook_events: {
        Row: {
          cod_collected: number | null
          consignment_id: string | null
          courier_status: string | null
          delivery_charge: number | null
          id: string
          mapped_order_status: string | null
          note: string | null
          order_id: string | null
          raw_payload: Json
          received_at: string
          tracking_code: string | null
        }
        Insert: {
          cod_collected?: number | null
          consignment_id?: string | null
          courier_status?: string | null
          delivery_charge?: number | null
          id?: string
          mapped_order_status?: string | null
          note?: string | null
          order_id?: string | null
          raw_payload?: Json
          received_at?: string
          tracking_code?: string | null
        }
        Update: {
          cod_collected?: number | null
          consignment_id?: string | null
          courier_status?: string | null
          delivery_charge?: number | null
          id?: string
          mapped_order_status?: string | null
          note?: string | null
          order_id?: string | null
          raw_payload?: Json
          received_at?: string
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          area: string | null
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean | null
          label: string | null
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          area?: string | null
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string | null
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_carts: {
        Row: {
          cart_items: Json | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_items?: Json | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_items?: Json | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          area: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_order_at: string | null
          loyalty_points: number
          notes: string | null
          phone: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_order_at?: string | null
          loyalty_points?: number
          notes?: string | null
          phone?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          html_body: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          trigger_event: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          trigger_event?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          trigger_event?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          description: string | null
          id: string
          outlet_id: string
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          outlet_id: string
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          outlet_id?: string
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_check_cache: {
        Row: {
          cancel_order: number | null
          checked_at: string
          id: string
          phone: string
          success_delivery: number | null
          success_ratio: number | null
          total_order: number | null
        }
        Insert: {
          cancel_order?: number | null
          checked_at?: string
          id?: string
          phone: string
          success_delivery?: number | null
          success_ratio?: number | null
          total_order?: number | null
        }
        Update: {
          cancel_order?: number | null
          checked_at?: string
          id?: string
          phone?: string
          success_delivery?: number | null
          success_ratio?: number | null
          total_order?: number | null
        }
        Relationships: []
      }
      fraud_courier_breakdown: {
        Row: {
          cancelled_parcel: number | null
          checked_at: string
          courier_key: string
          courier_name: string | null
          id: string
          logo_url: string | null
          phone: string
          success_parcel: number | null
          success_ratio: number | null
          total_parcel: number | null
        }
        Insert: {
          cancelled_parcel?: number | null
          checked_at?: string
          courier_key: string
          courier_name?: string | null
          id?: string
          logo_url?: string | null
          phone: string
          success_parcel?: number | null
          success_ratio?: number | null
          total_parcel?: number | null
        }
        Update: {
          cancelled_parcel?: number | null
          checked_at?: string
          courier_key?: string
          courier_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string
          success_parcel?: number | null
          success_ratio?: number | null
          total_parcel?: number | null
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          notes: string | null
          outlet_id: string
          product_id: string | null
          qty_change: number
          reference_id: string | null
          user_id: string | null
          user_name: string | null
          variant_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          notes?: string | null
          outlet_id: string
          product_id?: string | null
          qty_change: number
          reference_id?: string | null
          user_id?: string | null
          user_name?: string | null
          variant_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          outlet_id?: string
          product_id?: string | null
          qty_change?: number
          reference_id?: string | null
          user_id?: string | null
          user_name?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          from_outlet_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          to_outlet_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          from_outlet_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          status?: string
          to_outlet_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          from_outlet_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          to_outlet_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_from_outlet_id_fkey"
            columns: ["from_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_outlet_id_fkey"
            columns: ["to_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image: string | null
          order_id: string
          price: number
          product_id: string | null
          product_image: string | null
          product_name: string | null
          qty: number
          quantity: number | null
          selected_variation: Json | null
          title: string
          unit_price: number | null
          variation: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          order_id: string
          price: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          qty?: number
          quantity?: number | null
          selected_variation?: Json | null
          title: string
          unit_price?: number | null
          variation?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          qty?: number
          quantity?: number | null
          selected_variation?: Json | null
          title?: string
          unit_price?: number | null
          variation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          note: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          balance_due: number | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          exchange_amount: number | null
          exchange_items: Json | null
          id: string
          notes: string | null
          order_id: string | null
          original_amount: number
          outlet_id: string | null
          processed_by: string | null
          processed_by_name: string | null
          reason: string | null
          reason_notes: string | null
          refund_amount: number | null
          return_receipt_number: string | null
          return_type: string
          returned_items: Json
          updated_at: string
        }
        Insert: {
          balance_due?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          exchange_amount?: number | null
          exchange_items?: Json | null
          id?: string
          notes?: string | null
          order_id?: string | null
          original_amount?: number
          outlet_id?: string | null
          processed_by?: string | null
          processed_by_name?: string | null
          reason?: string | null
          reason_notes?: string | null
          refund_amount?: number | null
          return_receipt_number?: string | null
          return_type?: string
          returned_items?: Json
          updated_at?: string
        }
        Update: {
          balance_due?: number | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          exchange_amount?: number | null
          exchange_items?: Json | null
          id?: string
          notes?: string | null
          order_id?: string | null
          original_amount?: number
          outlet_id?: string | null
          processed_by?: string | null
          processed_by_name?: string | null
          reason?: string | null
          reason_notes?: string | null
          refund_amount?: number | null
          return_receipt_number?: string | null
          return_type?: string
          returned_items?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          change_amount: number | null
          coupon_code: string | null
          coupon_discount: number | null
          courier_cod_collected: number | null
          courier_consignment_id: string | null
          courier_delivery_charge: number | null
          courier_last_synced_at: string | null
          courier_status: string | null
          courier_tracking_code: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          discount: number | null
          due_amount: number | null
          id: string
          items: Json
          lock_expiration: string | null
          locked_at: string | null
          locked_by: string | null
          locked_by_name: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          outlet_id: string | null
          paid_amount: number | null
          payment_details: Json | null
          payment_method: string | null
          payment_status: string | null
          points_monetary_value: number | null
          points_redeemed: number | null
          shipping_address: string | null
          shipping_area: string | null
          shipping_city: string | null
          shipping_cost: number | null
          source: string | null
          status: string | null
          subtotal: number | null
          tendered_amount: number | null
          total_amount: number
          tracking_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          change_amount?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          courier_cod_collected?: number | null
          courier_consignment_id?: string | null
          courier_delivery_charge?: number | null
          courier_last_synced_at?: string | null
          courier_status?: string | null
          courier_tracking_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          discount?: number | null
          due_amount?: number | null
          id?: string
          items?: Json
          lock_expiration?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_by_name?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          outlet_id?: string | null
          paid_amount?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          points_monetary_value?: number | null
          points_redeemed?: number | null
          shipping_address?: string | null
          shipping_area?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          source?: string | null
          status?: string | null
          subtotal?: number | null
          tendered_amount?: number | null
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          change_amount?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          courier_cod_collected?: number | null
          courier_consignment_id?: string | null
          courier_delivery_charge?: number | null
          courier_last_synced_at?: string | null
          courier_status?: string | null
          courier_tracking_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          discount?: number | null
          due_amount?: number | null
          id?: string
          items?: Json
          lock_expiration?: string | null
          locked_at?: string | null
          locked_by?: string | null
          locked_by_name?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          outlet_id?: string | null
          paid_amount?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          points_monetary_value?: number | null
          points_redeemed?: number | null
          shipping_address?: string | null
          shipping_area?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          source?: string | null
          status?: string | null
          subtotal?: number | null
          tendered_amount?: number | null
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlet_inventory: {
        Row: {
          created_at: string
          id: string
          outlet_id: string
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          outlet_id: string
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          outlet_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_inventory_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          is_main_branch: boolean
          master_pin_hash: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          master_pin_hash?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          master_pin_hash?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pos_drafts: {
        Row: {
          cart_items: Json | null
          created_at: string
          created_by: string | null
          customer_data: Json | null
          id: string
          label: string | null
          name: string | null
          payload: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_items?: Json | null
          created_at?: string
          created_by?: string | null
          customer_data?: Json | null
          id?: string
          label?: string | null
          name?: string | null
          payload?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_items?: Json | null
          created_at?: string
          created_by?: string | null
          customer_data?: Json | null
          id?: string
          label?: string | null
          name?: string | null
          payload?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          buying_price: number | null
          created_at: string
          product_id: string
          updated_at: string
        }
        Insert: {
          buying_price?: number | null
          created_at?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          buying_price?: number | null
          created_at?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          images: Json | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number
          review_text: string | null
          reviewer_name: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating: number
          review_text?: string | null
          reviewer_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number
          review_text?: string | null
          reviewer_name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color: string | null
          compare_at_price_cents: number | null
          created_at: string
          id: string
          price_cents: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          price_cents?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          price_cents?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          barcode: string | null
          benefits: Json | null
          brand: string | null
          category: string | null
          color_options: Json | null
          compare_at_price_cents: number | null
          created_at: string
          description: string | null
          faq: Json | null
          id: string
          images: Json | null
          is_online_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          price_cents: number
          rating: number | null
          review_count: number | null
          shop_category: string | null
          size_options: Json | null
          sku: string | null
          slug: string
          specs: Json | null
          status: string | null
          stock: number | null
          subcategory: string | null
          title: string
          updated_at: string
          variants: Json | null
          weight_grams: number | null
        }
        Insert: {
          badge?: string | null
          barcode?: string | null
          benefits?: Json | null
          brand?: string | null
          category?: string | null
          color_options?: Json | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          faq?: Json | null
          id?: string
          images?: Json | null
          is_online_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          price_cents?: number
          rating?: number | null
          review_count?: number | null
          shop_category?: string | null
          size_options?: Json | null
          sku?: string | null
          slug: string
          specs?: Json | null
          status?: string | null
          stock?: number | null
          subcategory?: string | null
          title: string
          updated_at?: string
          variants?: Json | null
          weight_grams?: number | null
        }
        Update: {
          badge?: string | null
          barcode?: string | null
          benefits?: Json | null
          brand?: string | null
          category?: string | null
          color_options?: Json | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          faq?: Json | null
          id?: string
          images?: Json | null
          is_online_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          price_cents?: number
          rating?: number | null
          review_count?: number | null
          shop_category?: string | null
          size_options?: Json | null
          sku?: string | null
          slug?: string
          specs?: Json | null
          status?: string | null
          stock?: number | null
          subcategory?: string | null
          title?: string
          updated_at?: string
          variants?: Json | null
          weight_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_outlet_id: string | null
          avatar_url: string | null
          can_access_pos: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_onboarded: boolean | null
          outlet_role: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_outlet_id?: string | null
          avatar_url?: string | null
          can_access_pos?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          outlet_role?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_outlet_id?: string | null
          avatar_url?: string | null
          can_access_pos?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_onboarded?: boolean | null
          outlet_role?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_outlet_id_fkey"
            columns: ["assigned_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      return_notes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          note: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_ip_rate_limits: {
        Row: {
          attempts: number
          created_at: string
          id: string
          ip_address: string
          window_start: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          ip_address: string
          window_start?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          ip_address?: string
          window_start?: string
        }
        Relationships: []
      }
      sms_rate_limits: {
        Row: {
          attempts: number
          created_at: string
          id: string
          phone: string
          window_start: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          phone: string
          window_start?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          phone?: string
          window_start?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          created_at: string
          delivery_inside_dhaka: number | null
          delivery_outside_dhaka: number | null
          featured_reviews: Json | null
          google_analytics_id: string | null
          google_tag_manager_id: string | null
          hero_slides: Json | null
          id: string
          invoice_terms: Json | null
          is_free_shipping_active: boolean | null
          meta_pixel_id: string | null
          offer_banner: Json | null
          signature_section: Json | null
          trust_badges: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_inside_dhaka?: number | null
          delivery_outside_dhaka?: number | null
          featured_reviews?: Json | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          hero_slides?: Json | null
          id?: string
          invoice_terms?: Json | null
          is_free_shipping_active?: boolean | null
          meta_pixel_id?: string | null
          offer_banner?: Json | null
          signature_section?: Json | null
          trust_badges?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_inside_dhaka?: number | null
          delivery_outside_dhaka?: number | null
          featured_reviews?: Json | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          hero_slides?: Json | null
          id?: string
          invoice_terms?: Json | null
          is_free_shipping_active?: boolean | null
          meta_pixel_id?: string | null
          offer_banner?: Json | null
          signature_section?: Json | null
          trust_badges?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          additional_info: string | null
          address: string | null
          area: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          division: string | null
          flat_no: string | null
          full_name: string
          house_no: string | null
          id: string
          is_default: boolean | null
          label: string | null
          notes: string | null
          phone: string
          post_office: string | null
          postal_code: string | null
          road: string | null
          road_no: string | null
          thana: string | null
          upazilla: string | null
          updated_at: string
          user_id: string
          village: string | null
          zilla: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          flat_no?: string | null
          full_name: string
          house_no?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          notes?: string | null
          phone: string
          post_office?: string | null
          postal_code?: string | null
          road?: string | null
          road_no?: string | null
          thana?: string | null
          upazilla?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
          zilla?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          flat_no?: string | null
          full_name?: string
          house_no?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          notes?: string | null
          phone?: string
          post_office?: string | null
          postal_code?: string | null
          road?: string | null
          road_no?: string | null
          thana?: string | null
          upazilla?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
          zilla?: string | null
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      complete_inventory_transfer: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      create_manual_order: {
        Args: {
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_delivery_fee?: number
          p_items?: Json
          p_payment_method?: string
          p_payment_status?: string
          p_shipping_address?: Json
          p_user_id?: string
        }
        Returns: string
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      outlet_has_master_pin: { Args: { p_outlet_id: string }; Returns: boolean }
      recalculate_product_inventory: {
        Args: { _product_id: string }
        Returns: undefined
      }
      set_outlet_master_pin: {
        Args: { p_outlet_id: string; p_pin: string }
        Returns: undefined
      }
      swap_order_item_variant: {
        Args: {
          p_new_color?: string
          p_new_size?: string
          p_new_variant_id: string
          p_old_variant_id: string
          p_order_item_id: string
        }
        Returns: Json
      }
      verify_outlet_master_pin: {
        Args: { p_outlet_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "customer" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "customer", "super_admin"],
    },
  },
} as const
