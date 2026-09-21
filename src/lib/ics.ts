import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { CAIRO_TZ } from './time';

interface IcsEvent {
  title: string;
  description: string;
  location: string;
  startAtUtc: string;
  endAtUtc: string;
}

function formatIcsDate(utcIso: string): string {
  return formatInTimeZone(parseISO(utcIso), CAIRO_TZ, "yyyyMMdd'T'HHmmss");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tito//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@tito.app`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART;TZID=${CAIRO_TZ}:${formatIcsDate(event.startAtUtc)}`,
    `DTEND;TZID=${CAIRO_TZ}:${formatIcsDate(event.endAtUtc)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function downloadIcs(event: IcsEvent, filename = 'tito-booking.ics'): void {
  const content = generateIcs(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
