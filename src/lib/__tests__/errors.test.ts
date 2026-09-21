import { describe, it, expect } from 'vitest';
import { extractErrorCode, mapErrorToI18nKey } from '../errors';

describe('error mapper', () => {
  it('maps SLOT_TAKEN', () => {
    expect(extractErrorCode({ message: 'SLOT_TAKEN: already booked' })).toBe('SLOT_TAKEN');
    expect(mapErrorToI18nKey('SLOT_TAKEN')).toBe('errors.SLOT_TAKEN');
  });

  it('maps unknown errors', () => {
    expect(extractErrorCode({ message: 'random error' })).toBe('UNKNOWN');
  });
});
