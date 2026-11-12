import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { nth } from '@/testing/dom';
import { allWorkOptions } from '@/testing/fixtures/all-work';
import { BRANDS } from '@/testing/fixtures/all-work-breakdown';
import { renderAllWorkPage, viewQueries } from '@/testing/fixtures/all-work-page';
import { reply } from '@/testing/replies';
import { resetAllWorkStore } from './all-work-store';

const withBrands = reply('GET /api/v1/all-work/options', {
  body: allWorkOptions({ attributes: [BRANDS] }),
});

afterEach(() => {
  resetAllWorkStore();
});

describe('All work in the page address (D-122)', () => {
  it('applies the attribute filter of a link from Plan details and shows it as a chip (039 R1)', async () => {
    const { api } = renderAllWorkPage(
      [withBrands],
      '/all-work?year=2026&attr=SA-1020:none,SO-1201',
    );

    expect(
      await screen.findByRole('button', { name: 'Remove filter: Brands: Helix, Not filled in' }),
    ).toBeInTheDocument();
    expect(nth(viewQueries(api), 0).getAll('attr')).toEqual(['SA-1020:none,SO-1201']);
  });

  it('keeps the filters, the view and the search in the address so a reload or a link restores them', async () => {
    const { user, router } = renderAllWorkPage([], '/all-work?year=2026&activityStatus=complete');

    await user.click(await screen.findByRole('tab', { name: 'Calendar' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'helix');

    await waitFor(() => {
      const address = new URLSearchParams(router.state.location.search);
      expect(address.get('search')).toBe('helix');
      expect(address.get('view')).toBe('calendar');
      expect(address.getAll('activityStatus')).toEqual(['complete']);
      expect(address.get('year')).toBe('2026');
    });
  });

  it('opens with the address of the standard view written in it', async () => {
    const { router } = renderAllWorkPage();

    await waitFor(() => expect(router.state.location.search).toBe('?year=2026'));
  });
});
