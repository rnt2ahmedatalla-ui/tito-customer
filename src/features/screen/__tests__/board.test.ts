import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, formatDuration, isIdle, minutesUntil, normalizeLayout, parseBoard, progress } from '../board';

describe('queue board', () => {
  it('returns null for a wrong link', () => {
    expect(parseBoard({ ok: false })).toBeNull();
    expect(parseBoard(null)).toBeNull();
  });

  it('parses barbers, states and detects busy vs idle', () => {
    const b = parseBoard({
      ok: true,
      shop: 'tito',
      shop_state: 'open',
      barbers: [
        { id: '1', name: 'Tito', photo: null, state: 'busy', now: { name: 'Ahmed', start: '2026-01-01T09:30:00Z', until: '2026-01-01T10:00:00Z' }, next: [{ name: 'Ali', at: '2026-01-01T10:00:00Z', end: '2026-01-01T10:30:00Z' }], wait_min: 50 },
        { id: '2', name: 'Hamada', photo: null, state: 'closed', reopen: '2026-01-02T11:00:00Z', now: null, next: [], wait_min: null },
      ],
      gallery: [{ thumb: 'a_t.webp', full: 'a.webp', caption_ar: null, caption_en: null }],
      packages: [],
      reviews: [{ name: 'Mo', rating: 5, comment: 'great' }, { name: 'x', rating: 5, comment: '' }],
      waitlist: [{ name: null, at: '2026-01-01T08:00:00Z' }],
      layout: { show_qr: false, text_size: 'xl' },
    });
    expect(b?.barbers).toHaveLength(2);
    expect(b?.barbers[0]?.now?.name).toBe('Ahmed');
    expect(b?.barbers[1]?.state).toBe('closed');
    expect(b?.barbers[1]?.wait_min).toBeNull();
    expect(b?.reviews).toHaveLength(1);
    expect(b?.layout.show_qr).toBe(false);
    expect(b?.layout.text_size).toBe('xl');
    expect(b?.layout.show_now).toBe(true);
    expect(isIdle(b!)).toBe(false);
    expect(isIdle({ ...b!, barbers: [b!.barbers[1]!] })).toBe(true);
  });

  it('old server data without state still works', () => {
    const b = parseBoard({ ok: true, barbers: [{ id: '1', name: 'T', now: null, next: [], wait_min: 0 }] });
    expect(b?.barbers[0]?.state).toBe('open');
    expect(b?.shopState).toBe('open');
  });

  it('normalizes layout with safe defaults', () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT);
    const l = normalizeLayout({ slide_seconds: 999, reviews_min: 0, name_style: 'bad', side: { reviews: false } });
    expect(l.slide_seconds).toBe(60);
    expect(l.reviews_min).toBe(4);
    expect(l.name_style).toBe('first');
    expect(l.side).toEqual({ gallery: true, reviews: false, offers: true });
  });

  it('formats durations and countdowns', () => {
    const t0 = Date.parse('2026-01-01T10:00:00Z');
    expect(minutesUntil('2026-01-01T10:12:10Z', t0)).toBe(13);
    expect(minutesUntil('2026-01-01T09:00:00Z', t0)).toBe(0);
    expect(formatDuration(12, true)).toBe('12 دقيقة');
    expect(formatDuration(70, true)).toBe('ساعة و10 د');
    expect(formatDuration(120, false)).toBe('2h');
    expect(progress('2026-01-01T09:30:00Z', '2026-01-01T10:30:00Z', t0)).toBeCloseTo(0.5);
  });
});
