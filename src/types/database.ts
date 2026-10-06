export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show';

export type PaymentStatus = 'awaiting' | 'submitted' | 'confirmed' | 'rejected';

export type PaymentMethod = 'instapay' | 'vodafone_cash' | 'cash' | 'pay_at_shop';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          duration_minutes: number;
          price_egp: number;
          is_active: boolean;
          is_extra: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          duration_minutes: number;
          price_egp: number;
          is_active?: boolean;
          is_extra?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          duration_minutes?: number;
          price_egp?: number;
          is_active?: boolean;
          is_extra?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      working_hours: {
        Row: {
          id: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          last_slot_start: string;
          is_closed: boolean;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          open_time: string;
          close_time: string;
          last_slot_start: string;
          is_closed?: boolean;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
          last_slot_start?: string;
          is_closed?: boolean;
        };
        Relationships: [];
      };
      time_off: {
        Row: {
          id: string;
          start_at: string;
          end_at: string;
          reason_ar: string | null;
          reason_en: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          start_at: string;
          end_at: string;
          reason_ar?: string | null;
          reason_en?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          start_at?: string;
          end_at?: string;
          reason_ar?: string | null;
          reason_en?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          slot_step_min: number;
          min_hours_before: number;
          max_days_ahead: number;
          cancel_window_hours: number;
          hold_minutes: number;
          max_active_pending_per_user: number;
          auto_complete: boolean;
          allow_pay_at_shop: boolean;
          instapay_number: string | null;
          vodafone_cash_number: string | null;
          payment_note_ar: string | null;
          payment_note_en: string | null;
          shop_name: string;
          shop_whatsapp: string | null;
          shop_location_url: string | null;
          hero_headline_ar: string | null;
          hero_headline_en: string | null;
          hero_support_ar: string | null;
          hero_support_en: string | null;
          about_ar: string | null;
          about_en: string | null;
          tagline_ar: string | null;
          tagline_en: string | null;
          timezone: string;
          booking_open: boolean;
          reminder_template_ar: string | null;
          reminder_template_en: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_step_min?: number;
          min_hours_before?: number;
          max_days_ahead?: number;
          cancel_window_hours?: number;
          hold_minutes?: number;
          max_active_pending_per_user?: number;
          auto_complete?: boolean;
          allow_pay_at_shop?: boolean;
          instapay_number?: string | null;
          vodafone_cash_number?: string | null;
          payment_note_ar?: string | null;
          payment_note_en?: string | null;
          shop_name?: string;
          shop_whatsapp?: string | null;
          shop_location_url?: string | null;
          timezone?: string;
          booking_open?: boolean;
          reminder_template_ar?: string | null;
          reminder_template_en?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slot_step_min?: number;
          min_hours_before?: number;
          max_days_ahead?: number;
          cancel_window_hours?: number;
          hold_minutes?: number;
          max_active_pending_per_user?: number;
          auto_complete?: boolean;
          allow_pay_at_shop?: boolean;
          instapay_number?: string | null;
          vodafone_cash_number?: string | null;
          payment_note_ar?: string | null;
          payment_note_en?: string | null;
          shop_name?: string;
          shop_whatsapp?: string | null;
          shop_location_url?: string | null;
          timezone?: string;
          booking_open?: boolean;
          reminder_template_ar?: string | null;
          reminder_template_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          service_id: string;
          service_name_ar: string;
          service_name_en: string;
          duration_minutes: number;
          start_at: string;
          end_at: string;
          status: BookingStatus;
          price_egp: number;
          hold_expires_at: string | null;
          pay_at_shop: boolean;
          reminder_sent_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          guest_name: string | null;
          guest_phone: string | null;
          move_start_at: string | null;
          move_end_at: string | null;
          move_token: string | null;
          move_status: string | null;
          move_requested_at: string | null;
          rate_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          service_id: string;
          service_name_ar: string;
          service_name_en: string;
          duration_minutes: number;
          start_at: string;
          end_at: string;
          status?: BookingStatus;
          price_egp: number;
          hold_expires_at?: string | null;
          pay_at_shop?: boolean;
          reminder_sent_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          guest_name?: string | null;
          guest_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          service_id?: string;
          service_name_ar?: string;
          service_name_en?: string;
          duration_minutes?: number;
          start_at?: string;
          end_at?: string;
          status?: BookingStatus;
          price_egp?: number;
          hold_expires_at?: string | null;
          pay_at_shop?: boolean;
          reminder_sent_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          guest_name?: string | null;
          guest_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title_ar: string;
          title_en: string;
          body_ar: string | null;
          body_en: string | null;
          entity: string | null;
          entity_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: never;
        Update: { is_read?: boolean };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          price_egp: number;
          image_path: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      booking_extras: {
        Row: {
          id: string;
          booking_id: string;
          service_id: string | null;
          name_ar: string;
          name_en: string;
          price_egp: number;
          created_at: string;
        };
        Insert: {
          booking_id: string;
          service_id?: string | null;
          name_ar: string;
          name_en: string;
          price_egp: number;
          created_at?: string;
        };
        Update: {
          booking_id?: string;
          service_id?: string | null;
          name_ar?: string;
          name_en?: string;
          price_egp?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_extras_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          method: PaymentMethod;
          status: PaymentStatus;
          transaction_ref: string | null;
          proof_path: string | null;
          rejection_reason: string | null;
          submitted_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          method: PaymentMethod;
          status?: PaymentStatus;
          transaction_ref?: string | null;
          proof_path?: string | null;
          rejection_reason?: string | null;
          submitted_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          method?: PaymentMethod;
          status?: PaymentStatus;
          transaction_ref?: string | null;
          proof_path?: string | null;
          rejection_reason?: string | null;
          submitted_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_available_slots: {
        Args: { p_service_id: string; p_date: string };
        Returns: { start_at: string }[];
      };
      get_next_available_slot: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      update_my_profile: {
        Args: { p_full_name: string; p_phone: string };
        Returns: undefined;
      };
      create_booking: {
        Args: {
          p_service_id: string;
          p_start_at: string;
          p_pay_at_shop?: boolean;
          p_extra_ids?: string[];
          p_notes?: string | null;
        };
        Returns: string;
      };
      submit_payment: {
        Args: {
          p_booking_id: string;
          p_method: string;
          p_transaction_ref: string;
          p_proof_path: string;
        };
        Returns: undefined;
      };
      customer_cancel_booking: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      get_booking_move: {
        Args: { p_token: string };
        Returns: Json;
      };
      respond_booking_move: {
        Args: { p_token: string; p_accept: boolean };
        Returns: Json;
      };
      get_review_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      list_recent_reviews: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          display_name: string;
        }[];
      };
      customer_mark_notifications_read: {
        Args: { p_ids?: string[] | null };
        Returns: Json;
      };
      get_rate_booking: {
        Args: { p_token: string };
        Returns: Json;
      };
      submit_review: {
        Args: { p_token: string; p_rating: number; p_comment?: string | null };
        Returns: Json;
      };
      create_product_order: {
        Args: { p_product_id: string };
        Returns: string;
      };
      submit_product_payment: {
        Args: {
          p_order_id: string;
          p_method: string;
          p_transaction_ref?: string | null;
          p_proof_path?: string | null;
        };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type WorkingHours = Database['public']['Tables']['working_hours']['Row'];
export type Settings = Database['public']['Tables']['settings']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];

export type BookingExtra = {
  id: string;
  name_ar: string;
  name_en: string;
  price_egp: number;
};

export type BookingWithDetails = Booking & {
  service: Service;
  payment: Payment | null;
  extras: BookingExtra[];
};
