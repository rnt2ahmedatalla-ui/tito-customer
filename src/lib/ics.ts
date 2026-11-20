import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export interface IcsEvent {
  uid?: string;
  title: string;
  description: string;
  location: string;
  startAtUtc: string;
  endAtUtc: string;
  /** تنبيهات قبل الميعاد بالدقايق (التليفون هو اللي بيبعتها، ببلاش) */
  alarmsMinutes?: number[];
}

// بنستخدم توقيت UTC عشان كل التطبيقات (آيفون/أندرويد/جوجل) تفهمه من غير تعريف منطقة زمنية
function utcStamp(iso: string): string {
  return formatInTimeZone(parseISO(iso), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function generateIcs(event: IcsEvent): string {
  const alarms = (event.alarmsMinutes ?? [120, 1440]).flatMap((m) => [
    'BEGIN:VALARM',
    `TRIGGER:-PT${m}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(event.title)}`,
    'END:VALARM',
  ]);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tito//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid ?? Date.now()}@tito.app`,
    `DTSTAMP:${utcStamp(new Date().toISOString())}`,
    `DTSTART:${utcStamp(event.startAtUtc)}`,
    `DTEND:${utcStamp(event.endAtUtc)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    ...alarms,
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function googleCalendarUrl(event: IcsEvent): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(event.startAtUtc)}/${utcStamp(event.endAtUtc)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export const isAndroid = (): boolean => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
export const isIOS = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * أندرويد: بيفتح تطبيق التقويم اللي في التليفون (أي تقويم: جوجل، سامسونج...) على شاشة "إضافة حدث" والبيانات جاهزة.
 * لو مفيش تطبيق تقويم بيفتح جوجل كاليندر على الويب.
 */
export function openAndroidCalendar(event: IcsEvent): void {
  const begin = parseISO(event.startAtUtc).getTime();
  const end = parseISO(event.endAtUtc).getTime();
  const enc = encodeURIComponent;
  const parts = [
    'action=android.intent.action.INSERT',
    'type=vnd.android.cursor.dir/event',
    `S.title=${enc(event.title)}`,
    `S.description=${enc(event.description)}`,
    `S.eventLocation=${enc(event.location)}`,
    `l.beginTime=${begin}`,
    `l.endTime=${end}`,
    `S.browser_fallback_url=${enc(googleCalendarUrl(event))}`,
  ];
  window.location.href = `intent:#Intent;${parts.join(';')};end`;
}
