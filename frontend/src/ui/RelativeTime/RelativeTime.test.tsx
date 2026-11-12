import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { RelativeTime } from './RelativeTime';

const AT = '2026-03-09T12:00:00Z';

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-03-12T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows how long ago and gives the full time in its name and tooltip', async () => {
    const { user } = renderWithProviders(<RelativeTime at={AT} />);

    const time = screen.getByRole('button', { name: /^3 days ago, 09 Mar 2026, \d\d:00$/ });
    expect(time).toHaveTextContent('3 days ago');
    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/09 Mar 2026, \d\d:00/);
    await expectNoAxeViolations();
  });

  it('shows the clock time in a list grouped by day, named by the full time', () => {
    renderWithProviders(<RelativeTime at={AT} show="clock" />);

    const time = screen.getByRole('button', { name: /^09 Mar 2026, \d\d:00$/ });
    expect(time).toHaveTextContent(/^\d\d:00$/);
  });
});
