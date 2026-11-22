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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      admin_finance_boxes: {
        Row: {
          boxes: Json
          id: number
          updated_at: string
        }
        Insert: {
          boxes?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          boxes?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          is_read: boolean
          kind: string
          title_ar: string
          title_en: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          kind: string
          title_ar: string
          title_en: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      admin_prefs: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      admin_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          lang: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          lang?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          lang?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_pay: {
        Row: {
          amount: number
          assistant_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
          pay_date: string
        }
        Insert: {
          amount: number
          assistant_id: string
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          pay_date?: string
        }
        Update: {
          amount?: number
          assistant_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          pay_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_pay_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          job: string
          monthly_salary: number
          name: string
          notes: string | null
          phone: string | null
          sort: number
          start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          job?: string
          monthly_salary?: number
          name: string
          notes?: string | null
          phone?: string | null
          sort?: number
          start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          job?: string
          monthly_salary?: number
          name?: string
          notes?: string | null
          phone?: string | null
          sort?: number
          start_date?: string | null
        }
        Relationships: []
      }
      attendance_config: {
        Row: {
          body_ar: string
          body_en: string
          id: number
          is_active: boolean
          minutes_before: number
          title_ar: string
          title_en: string
        }
        Insert: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          minutes_before?: number
          title_ar?: string
          title_en?: string
        }
        Update: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          minutes_before?: number
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor: string | null
          at: string
          changes: Json | null
          id: number
          op: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          actor?: string | null
          at?: string
          changes?: Json | null
          id?: number
          op: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          actor?: string | null
          at?: string
          changes?: Json | null
          id?: number
          op?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      birthday_config: {
        Row: {
          body_ar: string
          body_en: string
          id: number
          is_active: boolean
          percent_off: number
          title_ar: string
          title_en: string
          updated_at: string
          valid_days: number
        }
        Insert: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          percent_off?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
          valid_days?: number
        }
        Update: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          percent_off?: number
          title_ar?: string
          title_en?: string
          updated_at?: string
          valid_days?: number
        }
        Relationships: []
      }
      birthday_coupon_log: {
        Row: {
          coupon_id: string | null
          created_at: string
          user_id: string
          year: number
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          user_id: string
          year: number
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "birthday_coupon_log_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_coupon_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_extras: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
          price_egp: number
          service_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          price_egp: number
          service_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          price_egp?: number
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_extras_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_extras_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_push_sent: {
        Row: {
          booking_id: string
          reminder_id: string
          sent_at: string
        }
        Insert: {
          booking_id: string
          reminder_id: string
          sent_at?: string
        }
        Update: {
          booking_id?: string
          reminder_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_push_sent_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_push_sent_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "push_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_override: boolean
          attendance: string | null
          attendance_asked_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          coupon_code: string | null
          created_at: string
          customer_package_id: string | null
          discount_egp: number
          duration_minutes: number
          end_at: string
          guest_name: string | null
          guest_phone: string | null
          hold_expires_at: string | null
          id: string
          move_end_at: string | null
          move_requested_at: string | null
          move_start_at: string | null
          move_status: string | null
          move_token: string | null
          notes: string | null
          pay_at_shop: boolean
          price_before_discount: number | null
          price_egp: number
          push_reminded_at: string | null
          rate_token: string | null
          reminder_sent_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string
          service_name_ar: string
          service_name_en: string
          staff_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_override?: boolean
          attendance?: string | null
          attendance_asked_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_package_id?: string | null
          discount_egp?: number
          duration_minutes: number
          end_at: string
          guest_name?: string | null
          guest_phone?: string | null
          hold_expires_at?: string | null
          id?: string
          move_end_at?: string | null
          move_requested_at?: string | null
          move_start_at?: string | null
          move_status?: string | null
          move_token?: string | null
          notes?: string | null
          pay_at_shop?: boolean
          price_before_discount?: number | null
          price_egp: number
          push_reminded_at?: string | null
          rate_token?: string | null
          reminder_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id: string
          service_name_ar: string
          service_name_en: string
          staff_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_override?: boolean
          attendance?: string | null
          attendance_asked_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_package_id?: string | null
          discount_egp?: number
          duration_minutes?: number
          end_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          hold_expires_at?: string | null
          id?: string
          move_end_at?: string | null
          move_requested_at?: string | null
          move_start_at?: string | null
          move_status?: string | null
          move_token?: string | null
          notes?: string | null
          pay_at_shop?: boolean
          price_before_discount?: number | null
          price_egp?: number
          push_reminded_at?: string | null
          rate_token?: string | null
          reminder_sent_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string
          service_name_ar?: string
          service_name_en?: string
          staff_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_off_egp: number | null
          code: string
          created_at: string
          id: string
          kind: string
          note: string | null
          percent_off: number | null
          single_use: boolean
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          amount_off_egp?: number | null
          code: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          percent_off?: number | null
          single_use?: boolean
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          amount_off_egp?: number | null
          code?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          percent_off?: number | null
          single_use?: boolean
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          note: string
          staff_note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string
          staff_note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string
          staff_note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          is_read: boolean
          kind: string
          title_ar: string
          title_en: string
          user_id: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          kind: string
          title_ar: string
          title_en: string
          user_id: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean
          kind?: string
          title_ar?: string
          title_en?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          name_ar: string
          name_en: string
          package_id: string | null
          price_paid: number
          service_id: string | null
          sessions_left: number
          sessions_total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          name_ar: string
          name_en?: string
          package_id?: string | null
          price_paid?: number
          service_id?: string | null
          sessions_left: number
          sessions_total: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          package_id?: string | null
          price_paid?: number
          service_id?: string | null
          sessions_left?: number
          sessions_total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_photos: {
        Row: {
          uploaded_by: string
          status: string
          share_consent: boolean
          gallery_item_id: string | null
          reviewed_at: string | null
          created_at: string
          full_path: string
          id: string
          note: string | null
          staff_id: string | null
          taken_at: string
          thumb_path: string
          user_id: string
        }
        Insert: {
          uploaded_by?: string
          status?: string
          share_consent?: boolean
          gallery_item_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          full_path: string
          id?: string
          note?: string | null
          staff_id?: string | null
          taken_at?: string
          thumb_path: string
          user_id: string
        }
        Update: {
          uploaded_by?: string
          status?: string
          share_consent?: boolean
          gallery_item_id?: string | null
          reviewed_at?: string | null
          created_at?: string
          full_path?: string
          id?: string
          note?: string | null
          staff_id?: string | null
          taken_at?: string
          thumb_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_photos_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_settings: {
        Row: {
          products_enabled: boolean
          auto_complete_hours: number
          gallery_enabled: boolean
          id: number
          inactive_after_days: number
          inactive_banner_enabled: boolean
          noshow_prepay_after: number
          packages_enabled: boolean
          wait_estimate_enabled: boolean
          wait_window_hours: number
          waitlist_enabled: boolean
        }
        Insert: {
          products_enabled?: boolean
          auto_complete_hours?: number
          gallery_enabled?: boolean
          id?: number
          inactive_after_days?: number
          inactive_banner_enabled?: boolean
          noshow_prepay_after?: number
          packages_enabled?: boolean
          wait_estimate_enabled?: boolean
          wait_window_hours?: number
          waitlist_enabled?: boolean
        }
        Update: {
          products_enabled?: boolean
          auto_complete_hours?: number
          gallery_enabled?: boolean
          id?: number
          inactive_after_days?: number
          inactive_banner_enabled?: boolean
          noshow_prepay_after?: number
          packages_enabled?: boolean
          wait_estimate_enabled?: boolean
          wait_window_hours?: number
          waitlist_enabled?: boolean
        }
        Relationships: []
      }
      fin_assets: {
        Row: {
          cost: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          next_service_date: string | null
          note: string | null
          purchase_date: string | null
          service_every_days: number | null
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          next_service_date?: string | null
          note?: string | null
          purchase_date?: string | null
          service_every_days?: number | null
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          next_service_date?: string | null
          note?: string | null
          purchase_date?: string | null
          service_every_days?: number | null
        }
        Relationships: []
      }
      fin_budgets: {
        Row: {
          amount: number
          category_id: string
        }
        Insert: {
          amount?: number
          category_id: string
        }
        Update: {
          amount?: number
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_categories: {
        Row: {
          bucket: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          sort: number
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          sort?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      fin_cleaning_log: {
        Row: {
          created_at: string
          done_on: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          done_on: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          done_on?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_cleaning_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "fin_cleaning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cleaning_tasks: {
        Row: {
          freq: string
          id: string
          is_active: boolean
          name: string
          sort: number
        }
        Insert: {
          freq: string
          id?: string
          is_active?: boolean
          name: string
          sort?: number
        }
        Update: {
          freq?: string
          id?: string
          is_active?: boolean
          name?: string
          sort?: number
        }
        Relationships: []
      }
      fin_closings: {
        Row: {
          close_date: string
          counted_cash: number
          created_at: string
          diff: number
          expected_cash: number
          id: string
          note: string | null
          wallet_id: string | null
        }
        Insert: {
          close_date: string
          counted_cash: number
          created_at?: string
          diff: number
          expected_cash: number
          id?: string
          note?: string | null
          wallet_id?: string | null
        }
        Update: {
          close_date?: string
          counted_cash?: number
          created_at?: string
          diff?: number
          expected_cash?: number
          id?: string
          note?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_closings_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_item_moves: {
        Row: {
          created_at: string
          delta: number
          id: string
          item_id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          item_id: string
          note?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          item_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_item_moves_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "fin_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_cost: number
          min_qty: number
          name: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_cost?: number
          min_qty?: number
          name: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_cost?: number
          min_qty?: number
          name?: string
          unit?: string
        }
        Relationships: []
      }
      fin_plan: {
        Row: {
          barbers_fixed: number
          id: number
          monthly_goal: number
          owner_salary: number
          rent_base: number
          rent_start: string | null
          updated_at: string
          var_pct: number
        }
        Insert: {
          barbers_fixed?: number
          id?: number
          monthly_goal?: number
          owner_salary?: number
          rent_base?: number
          rent_start?: string | null
          updated_at?: string
          var_pct?: number
        }
        Update: {
          barbers_fixed?: number
          id?: number
          monthly_goal?: number
          owner_salary?: number
          rent_base?: number
          rent_start?: string | null
          updated_at?: string
          var_pct?: number
        }
        Relationships: []
      }
      fin_recurring: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number
          id: string
          is_active: boolean
          kind: string
          name: string
          start_date: string
          to_wallet_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          start_date?: string
          to_wallet_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          start_date?: string
          to_wallet_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurring_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_recurring_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_recurring_log: {
        Row: {
          created_at: string
          period: string
          recurring_id: string
        }
        Insert: {
          created_at?: string
          period: string
          recurring_id: string
        }
        Update: {
          created_at?: string
          period?: string
          recurring_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_recurring_log_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "fin_recurring"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_rent_steps: {
        Row: {
          amount: number
          created_at: string
          id: string
          pct: number
          step_start: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          pct?: number
          step_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          pct?: number
          step_start?: string
        }
        Relationships: []
      }
      fin_settings: {
        Row: {
          alloc: Json
          cash_wallet_id: string | null
          id: number
          online_wallet_id: string | null
          tracking_start: string
        }
        Insert: {
          alloc?: Json
          cash_wallet_id?: string | null
          id?: number
          online_wallet_id?: string | null
          tracking_start?: string
        }
        Update: {
          alloc?: Json
          cash_wallet_id?: string | null
          id?: number
          online_wallet_id?: string | null
          tracking_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_settings_cash_wallet_id_fkey"
            columns: ["cash_wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_settings_online_wallet_id_fkey"
            columns: ["online_wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          to_wallet_id: string | null
          tx_date: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          to_wallet_id?: string | null
          tx_date: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          to_wallet_id?: string | null
          tx_date?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "fin_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_wallets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_main: boolean
          kind: string
          name: string
          opening_balance: number
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          kind?: string
          name: string
          opening_balance?: number
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          kind?: string
          name?: string
          opening_balance?: number
          sort?: number
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          source_photo_id: string | null
          caption_ar: string | null
          caption_en: string | null
          created_at: string
          full_path: string
          id: string
          is_active: boolean
          sort: number
          thumb_path: string
        }
        Insert: {
          source_photo_id?: string | null
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          full_path: string
          id?: string
          is_active?: boolean
          sort?: number
          thumb_path: string
        }
        Update: {
          source_photo_id?: string | null
          caption_ar?: string | null
          caption_en?: string | null
          created_at?: string
          full_path?: string
          id?: string
          is_active?: boolean
          sort?: number
          thumb_path?: string
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          points: number
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          points: number
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          points: number
          reason?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          egp_per_point: number
          enabled: boolean
          id: number
          max_redeem_percent: number
          min_redeem_points: number
          points_per_100_egp: number
        }
        Insert: {
          egp_per_point?: number
          enabled?: boolean
          id?: number
          max_redeem_percent?: number
          min_redeem_points?: number
          points_per_100_egp?: number
        }
        Update: {
          egp_per_point?: number
          enabled?: boolean
          id?: number
          max_redeem_percent?: number
          min_redeem_points?: number
          points_per_100_egp?: number
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          price_egp: number
          service_id: string | null
          sessions: number
          validity_days: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string
          price_egp: number
          service_id?: string | null
          sessions: number
          validity_days?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          price_egp?: number
          service_id?: string | null
          sessions?: number
          validity_days?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_egp: number
          booking_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          proof_path: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string | null
          transaction_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_egp: number
          booking_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          proof_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          transaction_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_egp?: number
          booking_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          proof_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string | null
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string | null
          sort: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          sort?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          sort?: number
        }
        Relationships: []
      }
      product_orders: {
        Row: {
          qty: number
          unit_price: number | null
          pay_mode: string
          booking_id: string | null
          paid_at: string | null
          picked_up_at: string | null
          note: string | null
          created_at: string
          id: string
          method: string | null
          price_egp: number
          product_id: string | null
          product_name_ar: string
          product_name_en: string
          proof_path: string | null
          rejection_reason: string | null
          status: string
          transaction_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          qty?: number
          unit_price?: number | null
          pay_mode?: string
          booking_id?: string | null
          paid_at?: string | null
          picked_up_at?: string | null
          note?: string | null
          created_at?: string
          id?: string
          method?: string | null
          price_egp: number
          product_id?: string | null
          product_name_ar: string
          product_name_en: string
          proof_path?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          qty?: number
          unit_price?: number | null
          pay_mode?: string
          booking_id?: string | null
          paid_at?: string | null
          picked_up_at?: string | null
          note?: string | null
          created_at?: string
          id?: string
          method?: string | null
          price_egp?: number
          product_id?: string | null
          product_name_ar?: string
          product_name_en?: string
          proof_path?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          note: string | null
          notified_at: string | null
          notified_via: string | null
          product_id: string | null
          product_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          notified_at?: string | null
          notified_via?: string | null
          product_id?: string | null
          product_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          notified_at?: string | null
          notified_via?: string | null
          product_id?: string | null
          product_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          in_stock: boolean
          thumb_path: string | null
          is_featured: boolean
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name_ar: string
          name_en: string
          price_egp: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          in_stock?: boolean
          thumb_path?: string | null
          is_featured?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name_ar: string
          name_en: string
          price_egp: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          in_stock?: boolean
          thumb_path?: string | null
          is_featured?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string
          price_egp?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
          is_blocked: boolean
          language: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_blocked?: boolean
          language?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_blocked?: boolean
          language?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      push_reminders: {
        Row: {
          body_ar: string
          body_en: string
          created_at: string
          id: string
          is_active: boolean
          minutes_before: number
          title_ar: string
          title_en: string
        }
        Insert: {
          body_ar?: string
          body_en?: string
          created_at?: string
          id?: string
          is_active?: boolean
          minutes_before: number
          title_ar?: string
          title_en?: string
        }
        Update: {
          body_ar?: string
          body_en?: string
          created_at?: string
          id?: string
          is_active?: boolean
          minutes_before?: number
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          lang: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          lang?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          lang?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      push_winback: {
        Row: {
          body_ar: string
          body_en: string
          cooldown_days: number
          days_since: number
          id: number
          is_active: boolean
          send_hour: number
          title_ar: string
          title_en: string
        }
        Insert: {
          body_ar?: string
          body_en?: string
          cooldown_days?: number
          days_since?: number
          id?: number
          is_active?: boolean
          send_hour?: number
          title_ar?: string
          title_en?: string
        }
        Update: {
          body_ar?: string
          body_en?: string
          cooldown_days?: number
          days_since?: number
          id?: number
          is_active?: boolean
          send_hour?: number
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      push_winback_log: {
        Row: {
          id: number
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: number
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      queue_screen: {
        Row: {
          id: number
          is_enabled: boolean
          offers_ar: string | null
          offers_en: string | null
          token: string
          upcoming_count: number
          updated_at: string
        }
        Insert: {
          id?: number
          is_enabled?: boolean
          offers_ar?: string | null
          offers_en?: string | null
          token?: string
          upcoming_count?: number
          updated_at?: string
        }
        Update: {
          id?: number
          is_enabled?: boolean
          offers_ar?: string | null
          offers_en?: string | null
          token?: string
          upcoming_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      recurring_breaks: {
        Row: {
          created_at: string
          days_of_week: number[]
          end_time: string
          id: string
          is_active: boolean
          reason: string
          staff_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          end_time: string
          id?: string
          is_active?: boolean
          reason?: string
          staff_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          end_time?: string
          id?: string
          is_active?: boolean
          reason?: string
          staff_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_breaks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string
          display_name: string | null
          id: string
          rate_token: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          rate_token?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          rate_token?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          is_archived: boolean
          created_at: string
          description_ar: string | null
          description_en: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_extra: boolean
          name_ar: string
          name_en: string
          price_egp: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          is_archived?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          is_extra?: boolean
          name_ar: string
          name_en: string
          price_egp: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          is_archived?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_extra?: boolean
          name_ar?: string
          name_en?: string
          price_egp?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          about_ar: string | null
          about_en: string | null
          allow_pay_at_shop: boolean
          auto_complete: boolean
          auto_confirm_payment: boolean
          booking_open: boolean
          booking_policy_ar: string | null
          booking_policy_en: string | null
          cancel_window_hours: number
          cancellation_template_ar: string
          cancellation_template_en: string
          confirmation_template_ar: string
          confirmation_template_en: string
          hero_headline_ar: string | null
          hero_headline_en: string | null
          hero_support_ar: string | null
          hero_support_en: string | null
          hold_minutes: number
          id: number
          instapay_number: string | null
          max_active_pending_per_user: number
          max_days_ahead: number
          min_hours_before: number
          payment_note_ar: string | null
          payment_note_en: string | null
          reminder_minutes_before: number
          reminder_template_ar: string
          reminder_template_en: string
          shop_location_url: string | null
          shop_name: string
          shop_whatsapp: string | null
          slot_step_min: number
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_youtube: string | null
          tagline_ar: string | null
          tagline_en: string | null
          timezone: string
          updated_at: string
          vodafone_cash_number: string | null
        }
        Insert: {
          about_ar?: string | null
          about_en?: string | null
          allow_pay_at_shop?: boolean
          auto_complete?: boolean
          auto_confirm_payment?: boolean
          booking_open?: boolean
          booking_policy_ar?: string | null
          booking_policy_en?: string | null
          cancel_window_hours?: number
          cancellation_template_ar?: string
          cancellation_template_en?: string
          confirmation_template_ar?: string
          confirmation_template_en?: string
          hero_headline_ar?: string | null
          hero_headline_en?: string | null
          hero_support_ar?: string | null
          hero_support_en?: string | null
          hold_minutes?: number
          id?: number
          instapay_number?: string | null
          max_active_pending_per_user?: number
          max_days_ahead?: number
          min_hours_before?: number
          payment_note_ar?: string | null
          payment_note_en?: string | null
          reminder_minutes_before?: number
          reminder_template_ar?: string
          reminder_template_en?: string
          shop_location_url?: string | null
          shop_name?: string
          shop_whatsapp?: string | null
          slot_step_min?: number
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          timezone?: string
          updated_at?: string
          vodafone_cash_number?: string | null
        }
        Update: {
          about_ar?: string | null
          about_en?: string | null
          allow_pay_at_shop?: boolean
          auto_complete?: boolean
          auto_confirm_payment?: boolean
          booking_open?: boolean
          booking_policy_ar?: string | null
          booking_policy_en?: string | null
          cancel_window_hours?: number
          cancellation_template_ar?: string
          cancellation_template_en?: string
          confirmation_template_ar?: string
          confirmation_template_en?: string
          hero_headline_ar?: string | null
          hero_headline_en?: string | null
          hero_support_ar?: string | null
          hero_support_en?: string | null
          hold_minutes?: number
          id?: number
          instapay_number?: string | null
          max_active_pending_per_user?: number
          max_days_ahead?: number
          min_hours_before?: number
          payment_note_ar?: string | null
          payment_note_en?: string | null
          reminder_minutes_before?: number
          reminder_template_ar?: string
          reminder_template_en?: string
          shop_location_url?: string | null
          shop_name?: string
          shop_whatsapp?: string | null
          slot_step_min?: number
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          timezone?: string
          updated_at?: string
          vodafone_cash_number?: string | null
        }
        Relationships: []
      }
      special_periods: {
        Row: {
          breaks: Json
          close_time: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          last_slot_start: string | null
          name_ar: string
          name_en: string | null
          open_time: string
          release_on: string | null
          start_date: string
        }
        Insert: {
          breaks?: Json
          close_time?: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          last_slot_start?: string | null
          name_ar: string
          name_en?: string | null
          open_time?: string
          release_on?: string | null
          start_date: string
        }
        Update: {
          breaks?: Json
          close_time?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          last_slot_start?: string | null
          name_ar?: string
          name_en?: string | null
          open_time?: string
          release_on?: string | null
          start_date?: string
        }
        Relationships: []
      }
      special_request_config: {
        Row: {
          allow_over_time_off: boolean
          id: number
          is_enabled: boolean
          max_days_ahead: number
          max_pending_per_customer: number
          min_hours_ahead: number
          open_from: string
          open_to: string
          surcharge_pct: number
        }
        Insert: {
          allow_over_time_off?: boolean
          id?: number
          is_enabled?: boolean
          max_days_ahead?: number
          max_pending_per_customer?: number
          min_hours_ahead?: number
          open_from?: string
          open_to?: string
          surcharge_pct?: number
        }
        Update: {
          allow_over_time_off?: boolean
          id?: number
          is_enabled?: boolean
          max_days_ahead?: number
          max_pending_per_customer?: number
          min_hours_ahead?: number
          open_from?: string
          open_to?: string
          surcharge_pct?: number
        }
        Relationships: []
      }
      special_requests: {
        Row: {
          base_price: number
          booking_id: string | null
          created_at: string
          decided_at: string | null
          end_at: string
          id: string
          note: string | null
          price_egp: number
          reject_reason: string | null
          service_id: string
          start_at: string
          status: string
          surcharge_pct: number
          user_id: string
        }
        Insert: {
          base_price: number
          booking_id?: string | null
          created_at?: string
          decided_at?: string | null
          end_at: string
          id?: string
          note?: string | null
          price_egp: number
          reject_reason?: string | null
          service_id: string
          start_at: string
          status?: string
          surcharge_pct: number
          user_id: string
        }
        Update: {
          base_price?: number
          booking_id?: string | null
          created_at?: string
          decided_at?: string | null
          end_at?: string
          id?: string
          note?: string | null
          price_egp?: number
          reject_reason?: string | null
          service_id?: string
          start_at?: string
          status?: string
          surcharge_pct?: number
          user_id?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          base_salary: number
          bio: string | null
          bio_en: string | null
          commission_pct: number
          created_at: string
          experience_years: number | null
          id: string
          is_active: boolean
          is_owner: boolean
          name: string
          photo: string | null
          socials: Json
          sort: number
          user_id: string | null
        }
        Insert: {
          base_salary?: number
          bio?: string | null
          bio_en?: string | null
          commission_pct?: number
          created_at?: string
          experience_years?: number | null
          id?: string
          is_active?: boolean
          is_owner?: boolean
          name: string
          photo?: string | null
          socials?: Json
          sort?: number
          user_id?: string | null
        }
        Update: {
          base_salary?: number
          bio?: string | null
          bio_en?: string | null
          commission_pct?: number
          created_at?: string
          experience_years?: number | null
          id?: string
          is_active?: boolean
          is_owner?: boolean
          name?: string
          photo?: string | null
          socials?: Json
          sort?: number
          user_id?: string | null
        }
        Relationships: []
      }
      staff_hours: {
        Row: {
          day_of_week: number
          end_time: string | null
          is_off: boolean
          staff_id: string
          start_time: string | null
        }
        Insert: {
          day_of_week: number
          end_time?: string | null
          is_off?: boolean
          staff_id: string
          start_time?: string | null
        }
        Update: {
          day_of_week?: number
          end_time?: string | null
          is_off?: boolean
          staff_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_hours_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_private: {
        Row: {
          phone: string | null
          staff_id: string
        }
        Insert: {
          phone?: string | null
          staff_id: string
        }
        Update: {
          phone?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_private_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          is_offered: boolean
          price_egp: number | null
          service_id: string
          staff_id: string
        }
        Insert: {
          is_offered?: boolean
          price_egp?: number | null
          service_id: string
          staff_id: string
        }
        Update: {
          is_offered?: boolean
          price_egp?: number | null
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          all_day: boolean
          created_at: string
          end_at: string
          id: string
          reason: string
          release_on: string | null
          staff_id: string | null
          start_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          end_at: string
          id?: string
          reason?: string
          release_on?: string | null
          staff_id?: string | null
          start_at: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          end_at?: string
          id?: string
          reason?: string
          release_on?: string | null
          staff_id?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_scheduled: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          notified_at: string | null
          recipients: Json
          send_at: string
          sent_to: Json
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          notified_at?: string | null
          recipients?: Json
          send_at: string
          sent_to?: Json
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          notified_at?: string | null
          recipients?: Json
          send_at?: string
          sent_to?: Json
          status?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          day: string
          id: string
          note: string | null
          offer_end: string | null
          offer_expires_at: string | null
          offer_start: string | null
          service_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          note?: string | null
          offer_end?: string | null
          offer_expires_at?: string | null
          offer_start?: string | null
          service_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          note?: string | null
          offer_end?: string | null
          offer_expires_at?: string | null
          offer_start?: string | null
          service_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_config: {
        Row: {
          body_ar: string
          body_en: string
          id: number
          is_active: boolean
          offer_minutes: number
          title_ar: string
          title_en: string
        }
        Insert: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          offer_minutes?: number
          title_ar?: string
          title_en?: string
        }
        Update: {
          body_ar?: string
          body_en?: string
          id?: number
          is_active?: boolean
          offer_minutes?: number
          title_ar?: string
          title_en?: string
        }
        Relationships: []
      }
      working_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          last_slot_start: string
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          last_slot_start?: string
          open_time?: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          last_slot_start?: string
          open_time?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_photo_published: {
        Args: { p_gallery: string; p_photo: string }
        Returns: undefined
      }
      admin_photo_review: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      customer_add_photo: {
        Args: { p_full: string; p_note?: string | null; p_share?: boolean; p_thumb: string }
        Returns: string
      }
      customer_delete_photo: {
        Args: { p_id: string }
        Returns: Json
      }
      customer_set_photo_share: {
        Args: { p_id: string; p_share: boolean }
        Returns: undefined
      }
      admin_product_request_notify: {
        Args: { p_id: string }
        Returns: Json
      }
      admin_product_request_set: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      cancel_my_product_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      cancel_my_product_request: {
        Args: { p_id: string }
        Returns: undefined
      }
      create_product_order_v2: {
        Args: { p_booking_id?: string | null; p_note?: string | null; p_pay?: string; p_product_id: string; p_qty?: number }
        Returns: string
      }
      request_product: {
        Args: { p_category_id?: string | null; p_name?: string | null; p_note?: string | null; p_product_id?: string | null }
        Returns: string
      }
      set_my_product_order_booking: {
        Args: { p_booking_id: string | null; p_order_id: string }
        Returns: undefined
      }
      admin_add_review: {
        Args: { p_comment: string; p_display_name?: string; p_rating: number }
        Returns: Json
      }
      admin_block_user: {
        Args: { p_blocked: boolean; p_user_id: string }
        Returns: Json
      }
      admin_cancel_booking: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: Json
      }
      admin_cancel_booking_move: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      admin_confirm_payment: { Args: { p_payment_id: string }; Returns: Json }
      admin_confirm_payment_group: {
        Args: { p_payment_id: string }
        Returns: number
      }
      admin_create_booking: {
        Args: {
          p_name: string
          p_paid_cash?: boolean
          p_phone: string
          p_service_id: string
          p_start_at: string
        }
        Returns: Json
      }
      admin_create_booking_ex: {
        Args: {
          p_extra_ids?: string[]
          p_force?: boolean
          p_name: string
          p_paid_cash?: boolean
          p_phone: string
          p_service_id: string
          p_staff_id?: string
          p_start_at: string
        }
        Returns: Json
      }
      admin_create_booking_force: {
        Args: {
          p_name: string
          p_paid_cash?: boolean
          p_phone: string
          p_service_id: string
          p_start_at: string
        }
        Returns: Json
      }
      admin_dashboard_stats: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      admin_decide_special_request: {
        Args: { p_accept: boolean; p_id: string; p_reason?: string }
        Returns: string
      }
      admin_delete_customer: {
        Args: { p_user: string; p_with_bookings?: boolean }
        Returns: Json
      }
      admin_delete_review: { Args: { p_id: string }; Returns: Json }
      admin_finance_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_link_staff_user: {
        Args: { p_email: string; p_staff: string }
        Returns: boolean
      }
      admin_list_special_requests: {
        Args: never
        Returns: {
          base_price: number
          created_at: string
          end_at: string
          full_name: string
          id: string
          note: string
          phone: string
          price_egp: number
          reject_reason: string
          service_name_ar: string
          service_name_en: string
          start_at: string
          status: string
          surcharge_pct: number
          user_id: string
        }[]
      }
      admin_loyalty_adjust: {
        Args: { p_note: string; p_points: number; p_user: string }
        Returns: undefined
      }
      admin_loyalty_balances: {
        Args: never
        Returns: {
          full_name: string
          phone: string
          points: number
          user_id: string
        }[]
      }
      admin_mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: Json
      }
      admin_mark_reminder_sent: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      admin_propose_booking_move: {
        Args: { p_booking_id: string; p_start_at: string }
        Returns: Json
      }
      admin_prune_audit: { Args: { p_days?: number }; Returns: number }
      admin_purge_barber_data: {
        Args: { p_before: string; p_staff: string }
        Returns: Json
      }
      admin_purge_extras: {
        Args: { p_before: string; p_scopes: string[] }
        Returns: Json
      }
      admin_purge_preview: {
        Args: { p_before: string; p_staff: string }
        Returns: Json
      }
      admin_push_test: { Args: never; Returns: undefined }
      admin_push_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      admin_reject_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      admin_reject_payment_group: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: number
      }
      admin_rotate_queue_token: { Args: never; Returns: string }
      admin_search_customers: {
        Args: { p_limit: number; p_offset: number; p_q: string }
        Returns: Database["public"]["CompositeTypes"]["customer_search_result"][]
        SetofOptions: {
          from: "*"
          to: "customer_search_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_sell_package: {
        Args: { p_package: string; p_user: string }
        Returns: string
      }
      admin_set_booking_staff: {
        Args: { p_booking_id: string; p_staff_id: string }
        Returns: undefined
      }
      admin_set_booking_status: {
        Args: {
          p_booking_id: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: Json
      }
      admin_set_owner_staff: { Args: { p_staff_id: string }; Returns: number }
      admin_set_product_order_status: {
        Args: { p_order_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      admin_set_staff_login: {
        Args: { p_password: string; p_staff: string; p_username: string }
        Returns: string
      }
      admin_staff_emails: {
        Args: never
        Returns: {
          email: string
          staff_id: string
        }[]
      }
      admin_staff_usernames: {
        Args: never
        Returns: {
          staff_id: string
          username: string
        }[]
      }
      admin_unlink_staff_user: { Args: { p_staff: string }; Returns: undefined }
      admin_use_package_session: {
        Args: { p_booking: string; p_customer_package: string }
        Returns: undefined
      }
      apply_staff_pricing: {
        Args: { p_booking_id: string; p_staff_id: string }
        Returns: undefined
      }
      auto_complete_bookings: { Args: never; Returns: number }
      barbers_now: { Args: never; Returns: Json }
      cancel_special_request: { Args: { p_id: string }; Returns: undefined }
      coupons_available: { Args: never; Returns: boolean }
      create_booking:
        | {
            Args: {
              p_extra_ids?: string[]
              p_pay_at_shop?: boolean
              p_service_id: string
              p_start_at: string
            }
            Returns: string
          }
        | {
            Args: {
              p_extra_ids?: string[]
              p_notes?: string
              p_pay_at_shop?: boolean
              p_service_id: string
              p_start_at: string
            }
            Returns: string
          }
      create_booking_group: {
        Args: {
          p_pay_at_shop?: boolean
          p_service_ids: string[]
          p_start_at: string
        }
        Returns: string[]
      }
      create_booking_staff: {
        Args: {
          p_coupon?: string
          p_extra_ids: string[]
          p_notes: string
          p_pay_at_shop: boolean
          p_service_id: string
          p_staff_id: string
          p_start_at: string
        }
        Returns: string
      }
      create_booking_with_coupon: {
        Args: {
          p_coupon?: string
          p_extra_ids?: string[]
          p_notes?: string
          p_pay_at_shop?: boolean
          p_service_id: string
          p_start_at: string
        }
        Returns: string
      }
      create_group_booking: {
        Args: { p_items: Json; p_method: string }
        Returns: Json
      }
      create_product_order: { Args: { p_product_id: string }; Returns: string }
      create_special_request: {
        Args: { p_note?: string; p_service_id: string; p_start_at: string }
        Returns: string
      }
      current_staff_id: { Args: never; Returns: string }
      customer_add_review: {
        Args: { p_comment: string; p_rating: number }
        Returns: Json
      }
      customer_cancel_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      customer_mark_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: Json
      }
      customer_reschedule_booking: {
        Args: { p_booking_id: string; p_new_start_at: string }
        Returns: undefined
      }
      expire_stale_holds: { Args: never; Returns: undefined }
      expire_stale_moves: { Args: never; Returns: undefined }
      fin_apply_recurring: { Args: never; Returns: number }
      get_available_slots: {
        Args: { p_date: string; p_duration_min?: number; p_service_id: string }
        Returns: {
          start_at: string
        }[]
      }
      get_available_slots_any: {
        Args: { p_date: string; p_duration_min?: number; p_service_id: string }
        Returns: {
          start_at: string
        }[]
      }
      get_available_slots_staff: {
        Args: {
          p_date: string
          p_duration_min?: number
          p_service_id: string
          p_staff_id: string
        }
        Returns: {
          start_at: string
        }[]
      }
      get_booking_move: { Args: { p_token: string }; Returns: Json }
      get_fully_booked_days: {
        Args: { p_end_date: string; p_service_id: string; p_start_date: string }
        Returns: {
          booked_date: string
        }[]
      }
      get_next_available_slot: { Args: never; Returns: string }
      get_rate_booking: { Args: { p_token: string }; Returns: Json }
      get_review_stats: { Args: never; Returns: Json }
      get_special_config: { Args: never; Returns: Json }
      get_special_slots: {
        Args: { p_date: string; p_service_id: string }
        Returns: {
          price_egp: number
          start_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      list_recent_reviews: {
        Args: { p_limit?: number }
        Returns: {
          comment: string
          created_at: string
          display_name: string
          id: string
          rating: number
        }[]
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_entity: string
          p_entity_id: string
          p_meta?: Json
        }
        Returns: undefined
      }
      loyalty_balance: { Args: never; Returns: number }
      loyalty_redeem: {
        Args: { p_booking_id: string; p_points: number }
        Returns: Json
      }
      my_prepay_required: { Args: never; Returns: boolean }
      my_visit_status: { Args: never; Returns: Json }
      noshow_count: { Args: { p_user: string }; Returns: number }
      notify_admin: {
        Args: {
          p_body_ar?: string
          p_body_en?: string
          p_entity?: string
          p_entity_id?: string
          p_kind: string
          p_title_ar: string
          p_title_en: string
        }
        Returns: undefined
      }
      notify_customer: {
        Args: {
          p_body_ar?: string
          p_body_en?: string
          p_entity?: string
          p_entity_id?: string
          p_kind: string
          p_title_ar: string
          p_title_en: string
          p_user_id: string
        }
        Returns: undefined
      }
      preview_coupon: {
        Args: { p_code: string; p_price: number }
        Returns: Json
      }
      queue_board: { Args: { p_token: string }; Returns: Json }
      queue_estimate: { Args: never; Returns: Json }
      remove_admin_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      reprice_booking_for_staff: {
        Args: { p_booking_id: string; p_staff_id: string }
        Returns: undefined
      }
      respond_booking_move: {
        Args: { p_accept: boolean; p_token: string }
        Returns: Json
      }
      run_attendance_asks: { Args: never; Returns: undefined }
      run_birthday_coupons: { Args: never; Returns: number }
      run_push_reminders: { Args: never; Returns: undefined }
      run_push_winback: { Args: never; Returns: undefined }
      run_wa_scheduled: { Args: never; Returns: undefined }
      run_waitlist_chain: { Args: never; Returns: undefined }
      save_admin_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_lang?: string
          p_p256dh: string
        }
        Returns: undefined
      }
      save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_lang?: string
          p_p256dh: string
        }
        Returns: undefined
      }
      set_attendance: {
        Args: { p_booking_id: string; p_coming: boolean }
        Returns: string
      }
      set_my_birth_date: { Args: { p_date: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_booking_note: { Args: { p_booking_id: string }; Returns: string }
      staff_can_see_profile: { Args: { p_user: string }; Returns: boolean }
      staff_offers: {
        Args: { p_extras: string[]; p_service: string; p_staff: string }
        Returns: boolean
      }
      submit_group_payment: {
        Args: {
          p_booking_ids: string[]
          p_method: string
          p_proof_path?: string
          p_transaction_ref?: string
        }
        Returns: string
      }
      submit_payment: {
        Args: {
          p_booking_id: string
          p_method: string
          p_proof_path: string
          p_transaction_ref: string
        }
        Returns: undefined
      }
      submit_product_payment: {
        Args: {
          p_method: string
          p_order_id: string
          p_proof_path?: string
          p_transaction_ref?: string
        }
        Returns: undefined
      }
      submit_review: {
        Args: { p_comment?: string; p_rating: number; p_token: string }
        Returns: Json
      }
      update_my_profile: {
        Args: { p_full_name: string; p_phone: string }
        Returns: undefined
      }
      waitlist_cancel: { Args: { p_id: string }; Returns: undefined }
      waitlist_join: {
        Args: { p_day: string; p_note?: string; p_service: string }
        Returns: string
      }
      waitlist_offer_slot: {
        Args: {
          p_end: string
          p_service: string
          p_skip_user: string
          p_start: string
        }
        Returns: undefined
      }
      winback_candidates: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
    }
    Enums: {
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "expired"
        | "no_show"
      payment_method: "instapay" | "vodafone_cash" | "cash" | "pay_at_shop"
      payment_status: "awaiting" | "submitted" | "confirmed" | "rejected"
    }
    CompositeTypes: {
      customer_search_result: {
        id: string | null
        full_name: string | null
        phone: string | null
        is_blocked: boolean | null
        total_bookings: number | null
        completed_count: number | null
        no_show_count: number | null
        last_visit: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_status: [
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
        "no_show",
      ],
      payment_method: ["instapay", "vodafone_cash", "cash", "pay_at_shop"],
      payment_status: ["awaiting", "submitted", "confirmed", "rejected"],
    },
  },
} as const
