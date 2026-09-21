import { format, parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const CAIRO_TZ = 'Africa/Cairo';

export function toCairoTime(utcIso: string): Date {
  return toZonedTime(parseISO(utcIso), CAIRO_TZ);
}

export function fromCairoLocalToUtc(localDate: Date): Date {
  return fromZonedTime(localDate, CAIRO_TZ);
}

export function formatCairoDate(utcIso: string, locale: string): string {
  const pattern = locale === 'ar' ? 'EEEE d MMMM' : 'EEEE, MMMM d';
  return formatInTimeZone(parseISO(utcIso), CAIRO_TZ, pattern, {
    locale: undefined,
  });
}

export function formatCairoTime(utcIso: string, locale: string): string {
  const pattern = locale === 'ar' ? 'h:mm a' : 'h:mm a';
  const formatted = formatInTimeZone(parseISO(utcIso), CAIRO_TZ, pattern);
  if (locale === 'ar') {
    return formatted.replace('AM', 'ص').replace('PM', 'م');
  }
  return formatted;
}

export function formatCairoDateShort(utcIso: string): string {
  return formatInTimeZone(parseISO(utcIso), CAIRO_TZ, 'yyyy-MM-dd');
}

export function formatCairoWeekdayAbbr(date: Date, locale: string): string {
  const pattern = locale === 'ar' ? 'EEEE' : 'EEE';
  return format(date, pattern);
}

export function getCairoNow(): Date {
  return toZonedTime(new Date(), CAIRO_TZ);
}

export function getDateRange(maxDaysAhead: number): Date[] {
  const today = startOfDay(getCairoNow());
  return Array.from({ length: maxDaysAhead + 1 }, (_, i) => addDays(today, i));
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isExpired(utcIso: string): boolean {
  return isBefore(parseISO(utcIso), new Date());
}

export function isWithinCancelWindow(startAtUtc: string, cancelWindowHours: number): boolean {
  const cancelDeadline = new Date(parseISO(startAtUtc).getTime() - cancelWindowHours * 60 * 60 * 1000);
  return isAfter(cancelDeadline, new Date());
}

export function getRemainingMs(utcIso: string): number {
  return Math.max(0, parseISO(utcIso).getTime() - Date.now());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
