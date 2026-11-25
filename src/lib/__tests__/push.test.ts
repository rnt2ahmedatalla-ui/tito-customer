import { vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));
import { describe, expect, it } from 'vitest';
import { withTimeout } from '../push';

describe('withTimeout', () => {
  it('rejects a promise that never settles', async () => {
    await expect(withTimeout(new Promise(() => undefined), 20, 'SW_NOT_READY')).rejects.toThrow('SW_NOT_READY');
  });
  it('passes through a fast result', async () => {
    await expect(withTimeout(Promise.resolve(5), 50)).resolves.toBe(5);
  });
});
