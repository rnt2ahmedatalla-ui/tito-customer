import { describe, it, expect } from 'vitest';
import { formatEGP, formatLatinNumber } from '../money';

describe('money formatting', () => {
  it('formats EGP with Latin digits', () => {
    expect(formatEGP(150)).toContain('150');
    expect(formatEGP(1500)).toContain('1,500');
  });

  it('formats latin numbers', () => {
    expect(formatLatinNumber(12345)).toBe('12,345');
  });
});
