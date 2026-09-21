const COOLDOWN_MS = 3000;
const MAX_PER_MINUTE = 5;
const WINDOW_MS = 60_000;

const lastAttempt = new Map<string, number>();
const attemptCounts = new Map<string, { count: number; windowStart: number }>();

export function canAttempt(key: string): boolean {
  const now = Date.now();
  const last = lastAttempt.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) return false;

  const record = attemptCounts.get(key);
  if (!record || now - record.windowStart > WINDOW_MS) {
    attemptCounts.set(key, { count: 0, windowStart: now });
    return true;
  }

  return record.count < MAX_PER_MINUTE;
}

export function recordAttempt(key: string): void {
  const now = Date.now();
  lastAttempt.set(key, now);

  const record = attemptCounts.get(key);
  if (!record || now - record.windowStart > WINDOW_MS) {
    attemptCounts.set(key, { count: 1, windowStart: now });
  } else {
    record.count += 1;
  }
}
