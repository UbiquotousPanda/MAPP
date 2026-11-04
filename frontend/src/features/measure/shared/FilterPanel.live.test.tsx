import { act, cleanup, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { reportFrame } from '@/testing/fixtures/reports';
import { renderWithProviders } from '@/testing/render';
import { FilterPanel } from './FilterPanel';
import { LIVE_DELAY_MS } from './live-filters';
import { DEFAULT_ADDRESS } from './report-address';
import type { ReportAddress } from './report-address';

const LIVE = { name: 'Update as I choose' };

interface EchoProps {
  start: ReportAddress;
  onApply: (next: ReportAddress) => void;
}

/** A frame that applies what the panel sends, as the report page does. */
function Echo({ start, onApply }: EchoProps) {
  const [applied, setApplied] = useState(start);
  return (
    <FilterPanel
      choices={reportFrame().choices}
      applied={applied}
      year={2026}
      onApply={(next) => {
        onApply(next);
        setApplied(next);
      }}
    />
  );
}

function renderLive(start: ReportAddress = DEFAULT_ADDRESS) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const onApply = vi.fn();
  const rendered = renderWithProviders(<Echo start={start} onApply={onApply} />);
  return { ...rendered, onApply };
}

const settle = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('FilterPanel, Update as I choose (039-C7, FR-013)', () => {
  it('starts off, and on applies a burst of changes once, a moment after the last one', async () => {
    const { user, onApply } = renderLive();
    const live = screen.getByRole('switch', LIVE);
    expect(live).toHaveAttribute('aria-checked', 'false');

    await user.click(live);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Up to date');
    await user.click(screen.getByRole('checkbox', { name: 'FY2026 Mobility' }));
    await user.click(screen.getByRole('checkbox', { name: 'Strategic' }));
    await user.click(screen.getByRole('checkbox', { name: 'Mobility China' }));

    expect(screen.getByRole('status')).toHaveTextContent('Updating…');
    expect(onApply).not.toHaveBeenCalled();
    await settle(LIVE_DELAY_MS);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        plans: ['P-1001'],
        planTypes: ['operational', 'crossMarket'],
        teams: ['T-1001'],
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Up to date');
    await settle(LIVE_DELAY_MS * 3);
    expect(onApply).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations();
  });

  it('never applies a group with nothing ticked, saying so instead', async () => {
    const { user, onApply } = renderLive({ ...DEFAULT_ADDRESS, planTypes: ['strategic'] });
    await user.click(screen.getByRole('switch', LIVE));
    const planType = screen.getByRole('group', { name: /Plan type/ });

    await user.click(within(planType).getByRole('button', { name: 'Clear all' }));
    await settle(LIVE_DELAY_MS * 2);

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Tick at least one value in Plan type.');
    await user.click(within(planType).getByRole('checkbox', { name: 'Operational' }));
    await settle(LIVE_DELAY_MS);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ planTypes: ['operational'] }));
  });

  it('keeps focus where it was after a live update', async () => {
    const { user } = renderLive();
    await user.click(screen.getByRole('switch', LIVE));
    const mobility = screen.getByRole('checkbox', { name: 'FY2026 Mobility' });

    await user.click(mobility);
    await settle(LIVE_DELAY_MS);

    expect(screen.getByRole('status')).toHaveTextContent('Up to date');
    expect(mobility).toHaveFocus();
    expect(mobility).not.toBeChecked();
  });

  it('is remembered in this browser and works from the keyboard', async () => {
    const { user } = renderLive();
    const live = screen.getByRole('switch', LIVE);
    live.focus();

    await user.keyboard('{Enter}');
    expect(live).toHaveAttribute('aria-checked', 'true');
    cleanup();
    renderWithProviders(<Echo start={DEFAULT_ADDRESS} onApply={() => {}} />);

    expect(screen.getByRole('switch', LIVE)).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it('keeps the Filters (n) drawer open while it applies, and shows Apply again when switched off', async () => {
    const { user, onApply } = renderLive();
    const toggle = screen.getByRole('button', { name: 'Filters (0)' });
    await user.click(toggle);
    const live = screen.getByRole('switch', LIVE);
    await user.click(live);

    await user.click(screen.getByRole('checkbox', { name: 'FY2026 Mobility' }));
    await settle(LIVE_DELAY_MS);

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(live);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'FY2026 Mobility' }));
    await settle(LIVE_DELAY_MS * 2);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Changes not applied yet');
  });
});
