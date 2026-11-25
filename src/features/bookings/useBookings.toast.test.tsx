import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const toastSuccess = vi.fn();
let handler: ((p: { new: Record<string, unknown> }) => void) | null = null;
const rows = [{ id: 'b1', user_id: 'u1', status: 'pending', start_at: '2026-12-01T12:00:00Z', service: null, payment: null, extras: [] }];

vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/features/profile/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/supabase', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain; chain.eq = () => chain;
  chain.order = () => Promise.resolve({ data: rows, error: null });
  const channel: Record<string, unknown> = {};
  channel.on = (_e: string, _f: unknown, cb: typeof handler) => { handler = cb; return channel; };
  channel.subscribe = () => channel;
  return { supabase: { from: () => chain, channel: () => channel, removeChannel: vi.fn() } };
});

import { useBookings } from './useBookings';

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, ...renderHook(() => useBookings(), { wrapper }) };
};

describe('useBookings realtime confirmed toast (real hook, mocked channel)', () => {
  beforeEach(() => { toastSuccess.mockClear(); handler = null; rows[0].status = 'pending'; });

  it('pending -> confirmed toasts once; later confirmed updates (ETA/move) do not', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(handler).not.toBeNull();
    act(() => handler!({ new: { id: 'b1', status: 'confirmed' } }));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    rows[0].status = 'confirmed'; // the refetch triggered by invalidate
    await waitFor(() => expect(result.current.data?.[0].status).toBe('confirmed'));
    act(() => handler!({ new: { id: 'b1', status: 'confirmed' } })); // ETA request
    act(() => handler!({ new: { id: 'b1', status: 'confirmed' } })); // move
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('update for a booking missing from loaded cache toasts (new booking)', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.data?.length).toBe(1));
    act(() => handler!({ new: { id: 'other', status: 'confirmed' } }));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it('update arriving before the list loaded does not toast', async () => {
    setup();
    expect(handler).not.toBeNull();
    act(() => handler!({ new: { id: 'b1', status: 'confirmed' } }));
    expect(toastSuccess).toHaveBeenCalledTimes(0);
  });
});
