// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

vi.mock('@/features/booking/useSeasons', () => ({
  seasonFor: () => undefined,
  seasonLocked: () => false,
}));

import { DateStrip } from '@/components/booking/DateStrip';
import i18n from '@/i18n';

const D1 = new Date(2026, 10, 26); // 2026-11-26
const D2 = new Date(2026, 10, 27);
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const FULL_KEY = key(D1);

function renderStrip(waitlistEnabled: boolean | undefined, onSelect = vi.fn()) {
  const utils = render(
    <DateStrip
      dates={[D1, D2]}
      selectedDate={null}
      closedDays={new Set()}
      fullyBookedDays={new Set([FULL_KEY])}
      waitlistEnabled={waitlistEnabled}
      onSelect={onSelect}
    />,
  );
  return { ...utils, onSelect };
}

describe('DateStrip full-day waitlist', () => {
  afterEach(() => cleanup());
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
  });

  it('waitlist on: full day stays selectable and shows مكتمل with waitlist invite', () => {
    const { onSelect } = renderStrip(true);
    const btn = screen.getByText('مكتمل').closest('button')!;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(FULL_KEY);
  });

  it('waitlist off: full day is disabled and shows مكتمل', () => {
    const { onSelect } = renderStrip(undefined);
    const btn = screen.getByText('مكتمل').closest('button')!;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('waitlist off=false: full day is disabled', () => {
    const { onSelect } = renderStrip(false);
    const btn = screen.getByText('مكتمل').closest('button')!;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
