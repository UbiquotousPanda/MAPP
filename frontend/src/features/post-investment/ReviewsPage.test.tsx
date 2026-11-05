import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { review } from '@/testing/fixtures/post-investment';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { pending, reply } from '@/testing/replies';
import { ReviewsPage } from './ReviewsPage';

const LIST = 'GET /api/v1/post-investment-reviews';
const AVAILABLE = { available: true, reason: '' };

function renderPage() {
  return renderWithProviders(<ReviewsPage />, {
    route: '/post-investment-reviews',
    path: '/post-investment-reviews',
    user: testUser(),
  });
}

describe('ReviewsPage', () => {
  it('shows a placeholder while the list loads (demo-mvp #7)', () => {
    mockApi([reply(LIST, () => pending())]);
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Post-investment reviews' }),
    ).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says there are no reviews yet, with no download (demo-mvp #7, #8)', async () => {
    mockApi([reply(LIST, { body: { items: [], export: AVAILABLE } })]);
    renderPage();

    expect(await screen.findByText('No post-investment reviews yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument();
  });

  it('offers Try again when the list fails to load (demo-mvp #7)', async () => {
    mockApi([reply(LIST, { status: 500 })]);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('lists each review with its plan path, status, amounts and the server’s ROI (demo-mvp #7)', async () => {
    const submitted = review({
      id: 'PIR-1002',
      activity: { id: 'A-1004', name: 'Helix first half' },
      status: 'submitted',
      roi: null,
      margin: null,
    });
    mockApi([reply(LIST, { body: { items: [review(), submitted], export: AVAILABLE } })]);
    renderPage();

    const table = await screen.findByRole('table', { name: 'Post-investment reviews' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    const first = within(within(table).getByRole('row', { name: /Tellus webinar series/ }));
    expect(first.getByRole('link', { name: 'Tellus webinar series' })).toHaveAttribute(
      'href',
      '/post-investment-reviews/PIR-1001',
    );
    expect(
      first.getByText('FY2026 Lubricants Europe › Tellus launch › Digital'),
    ).toBeInTheDocument();
    expect(first.getByText('Draft')).toBeInTheDocument();
    expect(first.getByText('36.25 %')).toBeInTheDocument();
    const second = within(within(table).getByRole('row', { name: /Helix first half/ }));
    expect(second.getByText('Submitted')).toBeInTheDocument();
    expect(second.getAllByText('Not set')).toHaveLength(2);
    expect(within(table).getByRole('columnheader', { name: 'Post-investment ROI' })).toBeVisible();
  });
});
