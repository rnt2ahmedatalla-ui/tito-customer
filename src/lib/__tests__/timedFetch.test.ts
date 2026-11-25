import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'k');

afterEach(() => vi.restoreAllMocks());

describe('timedFetch', () => {
  it('leaves writes and RPC calls without any abort signal added', async () => {
    const { timedFetch } = await import('../supabase');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await timedFetch('https://x.supabase.co/rest/v1/rpc/create_booking', { method: 'POST' });
    await timedFetch('https://x.supabase.co/rest/v1/payments', { method: 'PATCH' });
    expect(spy.mock.calls[0][1]?.signal).toBeUndefined();
    expect(spy.mock.calls[1][1]?.signal).toBeUndefined();
  });
  it('bounds refresh-token calls and keeps the caller signal working', async () => {
    const { timedFetch } = await import('../supabase');
    const outer = new AbortController();
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await timedFetch('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', { method: 'POST', signal: outer.signal });
    const sig = spy.mock.calls[0][1]?.signal as AbortSignal;
    expect(sig).toBeDefined();
    outer.abort();
    expect(sig.aborted).toBe(true);
  });
  it('does not bound sign-in code exchange', async () => {
    const { timedFetch } = await import('../supabase');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await timedFetch('https://x.supabase.co/auth/v1/token?grant_type=pkce', { method: 'POST' });
    expect(spy.mock.calls[0][1]?.signal).toBeUndefined();
  });
});
