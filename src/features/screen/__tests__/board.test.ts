import { describe, expect, it } from 'vitest';
import { isIdle, parseBoard } from '../board';

describe('queue board', () => {
  it('returns null for a wrong link', () => {
    expect(parseBoard({ ok: false })).toBeNull();
    expect(parseBoard(null)).toBeNull();
  });

  it('parses barbers and detects busy vs idle', () => {
    const b = parseBoard({
      ok: true,
      shop: 'tito',
      barbers: [
        { id: '1', name: 'Tito', photo: null, now: { name: 'Ahmed', until: '2026-01-01T10:00:00Z' }, next: [{ name: 'Ali', at: '2026-01-01T10:00:00Z' }], wait_min: 50 },
        { id: '2', name: 'Hamada', photo: null, now: null, next: [], wait_min: 0 },
      ],
      gallery: [{ thumb: 'a_t.webp', full: 'a.webp', caption_ar: null, caption_en: null }],
      packages: [],
    });
    expect(b?.barbers).toHaveLength(2);
    expect(b?.barbers[0]?.now?.name).toBe('Ahmed');
    expect(isIdle(b!)).toBe(false);
    expect(isIdle({ ...b!, barbers: [b!.barbers[1]!] })).toBe(true);
  });
});
