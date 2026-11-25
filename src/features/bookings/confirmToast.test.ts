import { describe, it, expect } from 'vitest';
import { shouldToastConfirmed } from './confirmToast';

const c = (id: string, status: string) => ({ id, status });
describe('shouldToastConfirmed', () => {
  it('pending -> confirmed toasts', () => expect(shouldToastConfirmed([c('a', 'pending')], { id: 'a', status: 'confirmed' })).toBe(true));
  it('confirmed -> confirmed (ETA request / move / attendance) does not toast', () =>
    expect(shouldToastConfirmed([c('a', 'confirmed')], { id: 'a', status: 'confirmed' })).toBe(false));
  it('booking missing from loaded cache still toasts (new booking)', () =>
    expect(shouldToastConfirmed([c('z', 'confirmed')], { id: 'a', status: 'confirmed' })).toBe(true));
  it('cache not loaded: no toast', () => expect(shouldToastConfirmed(undefined, { id: 'a', status: 'confirmed' })).toBe(false));
  it('non-confirmed status never toasts', () => {
    expect(shouldToastConfirmed([c('a', 'confirmed')], { id: 'a', status: 'cancelled' })).toBe(false);
    expect(shouldToastConfirmed([], { id: 'a', status: 'pending' })).toBe(false);
  });
  it('event ordering: two consecutive confirmed updates after refetch do not toast; a stale cache before refetch also does not', () => {
    let cache = [c('a', 'pending')];
    expect(shouldToastConfirmed(cache, { id: 'a', status: 'confirmed' })).toBe(true); // real confirm
    cache = [c('a', 'confirmed')]; // refetch landed
    expect(shouldToastConfirmed(cache, { id: 'a', status: 'confirmed' })).toBe(false); // ETA request
    expect(shouldToastConfirmed(cache, { id: 'a', status: 'confirmed' })).toBe(false); // move
  });
});
