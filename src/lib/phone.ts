import { z } from 'zod';

export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0125][0-9]{8}$/, 'invalid_phone');

export function isValidEgyptianPhone(phone: string): boolean {
  return egyptianPhoneSchema.safeParse(phone).success;
}

export function formatPhoneDisplay(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
