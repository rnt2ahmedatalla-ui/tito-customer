import type { PostgrestError } from '@supabase/supabase-js';

export type ErrorCode =
  | 'SLOT_TAKEN'
  | 'CANCEL_WINDOW_PASSED'
  | 'FORBIDDEN'
  | 'BLOCKED_USER'
  | 'PROFILE_INCOMPLETE'
  | 'TOO_MANY_PENDING'
  | 'BOOKING_CLOSED'
  | 'UNKNOWN';

const CODE_PATTERNS: { pattern: RegExp; code: ErrorCode }[] = [
  { pattern: /SLOT_TAKEN/i, code: 'SLOT_TAKEN' },
  { pattern: /CANCEL_WINDOW_PASSED/i, code: 'CANCEL_WINDOW_PASSED' },
  { pattern: /FORBIDDEN/i, code: 'FORBIDDEN' },
  { pattern: /BLOCKED_USER/i, code: 'BLOCKED_USER' },
  { pattern: /PROFILE_INCOMPLETE/i, code: 'PROFILE_INCOMPLETE' },
  { pattern: /TOO_MANY_PENDING/i, code: 'TOO_MANY_PENDING' },
  { pattern: /BOOKING_CLOSED/i, code: 'BOOKING_CLOSED' },
];

export function extractErrorCode(error: unknown): ErrorCode {
  const message = getErrorMessage(error);
  for (const { pattern, code } of CODE_PATTERNS) {
    if (pattern.test(message)) return code;
  }
  return 'UNKNOWN';
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as PostgrestError & { message?: string };
    return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' ');
  }
  if (typeof error === 'string') return error;
  return '';
}

export function getErrorReferenceId(error: unknown): string {
  const message = getErrorMessage(error);
  const hash = message.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  return `T${Math.abs(hash).toString(36).slice(0, 6).toUpperCase()}`;
}

export function mapErrorToI18nKey(code: ErrorCode): string {
  return `errors.${code}`;
}
