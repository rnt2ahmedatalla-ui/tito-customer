import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const ok = vi.fn(); const err = vi.fn(); const neutral = vi.fn();
vi.mock('sonner', () => ({ toast: Object.assign((...a: unknown[]) => neutral(...a), { success: (...a: unknown[]) => ok(...a), error: (...a: unknown[]) => err(...a) }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-router-dom', () => ({ Link: ({ children }: { children: unknown }) => children }));
let reply: { data: unknown; error: { message: string } | null } = { data: 'accepted', error: null };
const rpcMock = vi.fn(async () => reply);
let swapStatus: string | null = 'pending';
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => (rpcMock as (...x: unknown[]) => unknown)(...a), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: swapStatus ? { status: swapStatus } : null }) }) }) }) } }));
vi.mock('@/features/home/useHomeData', () => ({ useSettings: () => ({ data: {} }) }));

import { SwapRespond } from './LiveTurn';

const show = () => { const onDone = vi.fn(); render(<QueryClientProvider client={new QueryClient()}><SwapRespond swapId="s1" onDone={onDone} /></QueryClientProvider>); return onDone; };
beforeEach(() => { swapStatus = 'pending'; ok.mockClear(); err.mockClear(); neutral.mockClear(); rpcMock.mockClear(); cleanup(); });

describe('SwapRespond rendered', () => {
  it('Accept + server accepted -> success toast', async () => {
    reply = { data: 'accepted', error: null }; show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(ok).toHaveBeenCalledWith('Swapped ✅')); expect(err).not.toHaveBeenCalled();
  });
  it('Accept + server expired -> NO success, error toast', async () => {
    reply = { data: 'expired', error: null }; show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(err).toHaveBeenCalled()); expect(ok).not.toHaveBeenCalled();
  });
  it('Accept + legacy raised error -> error toast, no success', async () => {
    reply = { data: null, error: { message: 'EXPIRED' } }; show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(err).toHaveBeenCalled()); expect(ok).not.toHaveBeenCalled();
  });
  it('Accept + unexpected reply (true) -> neutral toast, never success', async () => {
    reply = { data: true, error: null }; const d = show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(neutral).toHaveBeenCalled()); expect(ok).not.toHaveBeenCalled(); expect(err).not.toHaveBeenCalled(); expect(d).toHaveBeenCalled();
  });
  it('Accept pressed but server says declined -> not shown as swapped', async () => {
    reply = { data: 'declined', error: null }; show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(neutral).toHaveBeenCalled()); expect(ok).not.toHaveBeenCalledWith('Swapped ✅');
  });
  it('Decline + declined -> stays toast; sends p_accept=false', async () => {
    reply = { data: 'declined', error: null }; show(); fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(ok).toHaveBeenCalledWith('OK, your time stays'));
    expect(rpcMock).toHaveBeenCalledWith('respond_swap', { p_swap_id: 's1', p_accept: false });
  });
  it('Accept + raised EXPIRED -> error toast and asks the server to close stale swaps', async () => {
    reply = { data: null, error: { message: 'EXPIRED' } }; show(); fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('expire_stale_swaps'));
  });
  it('swap already closed on the server -> no Accept/Decline buttons', async () => {
    swapStatus = 'expired'; show();
    await waitFor(() => expect(screen.getByText('This request is no longer available')).toBeTruthy());
    expect(screen.queryByText('Accept')).toBeNull();
  });
});
