import { describe, expect, it } from 'vitest';
import { swapOutcome } from './swapOutcome';

describe('swapOutcome', () => {
  it('current live function returns the text accepted / declined', () => {
    expect(swapOutcome('accepted', true)).toBe('accepted');
    expect(swapOutcome('declined', false)).toBe('declined');
  });
  it('expired is reported as expired for both buttons', () => {
    expect(swapOutcome('expired', true)).toBe('expired');
    expect(swapOutcome('expired', false)).toBe('expired');
  });
  it('anything unexpected is unknown, never a success', () => {
    for (const v of [null, undefined, '', 'ok', true, false, 1, {}, [], 'ACCEPTED']) {
      expect(swapOutcome(v, true)).toBe('unknown');
      expect(swapOutcome(v, false)).toBe('unknown');
    }
  });
  it('a result that contradicts the button is unknown', () => {
    expect(swapOutcome('declined', true)).toBe('unknown');
    expect(swapOutcome('accepted', false)).toBe('unknown');
  });
});

import { swapWindowText } from './swapOutcome';
describe('swapWindowText', () => {
  it('uses the real setting, not a hard-coded two hours', () => {
    expect(swapWindowText(120, false)).toBe('within 2 hours before/after your time');
    expect(swapWindowText(60, false)).toBe('within 1 hour before/after your time');
    expect(swapWindowText(90, false)).toBe('within 90 minutes before/after your time');
    expect(swapWindowText(180, true)).toContain('3');
    expect(swapWindowText(60, true)).toContain('ساعة');
  });
  it('unknown/invalid setting gives neutral wording with no number', () => {
    for (const v of [undefined, null, 'x', 0, -5, NaN]) expect(swapWindowText(v, false)).toBe('nearby times');
  });
});
