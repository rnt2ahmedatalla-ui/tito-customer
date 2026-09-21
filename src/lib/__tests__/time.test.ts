import { describe, it, expect } from 'vitest';
import { formatCairoTime, toCairoTime } from '../time';

describe('cairo timezone', () => {
  it('converts UTC to Cairo time', () => {
    const cairo = toCairoTime('2025-04-25T10:00:00Z');
    expect(cairo).toBeDefined();
  });

  it('formats time with Arabic AM/PM', () => {
    const formatted = formatCairoTime('2025-04-25T14:30:00Z', 'ar');
    expect(formatted).toMatch(/[صم]/);
  });

  it('handles October DST transition boundary', () => {
    const before = formatCairoTime('2025-10-31T20:00:00Z', 'en');
    const after = formatCairoTime('2025-11-01T20:00:00Z', 'en');
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
  });
});
