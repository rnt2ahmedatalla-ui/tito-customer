// الأنواع دي متولّدة أوتوماتيك من Supabase في supabase.ts
// والملف ده فيه أسماء مختصرة بنستخدمها في الكود.
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from './supabase';

export type { Database, Json, Tables, TablesInsert, TablesUpdate };

export type BookingStatus = Database['public']['Enums']['booking_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];

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
