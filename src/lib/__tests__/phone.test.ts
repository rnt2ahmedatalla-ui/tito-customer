import { describe, it, expect } from 'vitest';
import { isValidEgyptianPhone, egyptianPhoneSchema } from '../phone';

describe('egyptian phone validation', () => {
  it('accepts valid numbers', () => {
    expect(isValidEgyptianPhone('01012345678')).toBe(true);
    expect(isValidEgyptianPhone('01112345678')).toBe(true);
    expect(isValidEgyptianPhone('01212345678')).toBe(true);
    expect(isValidEgyptianPhone('01512345678')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(isValidEgyptianPhone('02012345678')).toBe(false);
    expect(isValidEgyptianPhone('0101234567')).toBe(false);
    expect(isValidEgyptianPhone('abc')).toBe(false);
    expect(egyptianPhoneSchema.safeParse('').success).toBe(false);
  });
});
