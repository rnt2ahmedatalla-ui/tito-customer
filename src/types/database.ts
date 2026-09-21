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

export type BookingWithDetails = Booking & {
  service: Service;
  payment: Payment | null;
};
