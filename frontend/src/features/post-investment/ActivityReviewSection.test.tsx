import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { review } from '@/testing/fixtures/post-investment';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { ActivityReviewSection } from './ActivityReviewSection';

const LIST = 'GET /api/v1/post-investment-reviews';
const AVAILABLE = { available: true, reason: '' };
const REFUSED = { available: false, reason: '' };

describe('ActivityReviewSection', () => {
  it("shows the activity's review with the server's ROI and a link to open it (demo-mvp #7)", async () => {
    mockApi([reply(LIST, { body: { items: [review()], export: AVAILABLE } })]);
    renderWithProviders(<ActivityReviewSection activityId="A-1003" edit={AVAILABLE} />, {
      user: testUser(),
    });

    expect(await screen.findByLabelText('Post-investment ROI: 36.25 %')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open review' })).toHaveAttribute(
      'href',
      '/post-investment-reviews/PIR-1001',
    );
  });

  it('starts a Draft review and opens it (demo-mvp #7)', async () => {
    const api = mockApi([
      reply(LIST, { body: { items: [], export: AVAILABLE } }),
      reply('POST /api/v1/post-investment-reviews', { status: 201, body: review() }),
    ]);
    const { user, router } = renderWithProviders(
      <ActivityReviewSection activityId="A-1003" edit={AVAILABLE} />,
      { user: testUser() },
    );

    await user.click(await screen.findByRole('button', { name: 'Start post-investment review' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/post-investment-reviews/PIR-1001'),
    );
    expect(api.bodiesOf('POST /api/v1/post-investment-reviews')).toEqual([
      { activityId: 'A-1003' },
    ]);
  });

  it('offers no start to a person who may not edit the activity (demo-mvp #7)', async () => {
    mockApi([reply(LIST, { body: { items: [], export: AVAILABLE } })]);
    renderWithProviders(<ActivityReviewSection activityId="A-1003" edit={REFUSED} />, {
      user: testUser(),
    });

    expect(
      await screen.findByText('This activity has no post-investment review yet.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Start post-investment review' }),
    ).not.toBeInTheDocument();
  });
});
