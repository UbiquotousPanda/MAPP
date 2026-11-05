import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { review } from '@/testing/fixtures/post-investment';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { ReviewPage } from './ReviewPage';

const GET = 'GET /api/v1/post-investment-reviews/{reviewId}';
const PATCH = 'PATCH /api/v1/post-investment-reviews/{reviewId}';
const SUBMIT = 'POST /api/v1/post-investment-reviews/{reviewId}/submit';

function renderPage() {
  return renderWithProviders(<ReviewPage />, {
    route: '/post-investment-reviews/PIR-1001',
    path: '/post-investment-reviews/:reviewId',
    user: testUser(),
  });
}

describe('ReviewPage', () => {
  it('shows the ROI the server worked out, labelled Post-investment ROI, with the live figures (demo-mvp #7, #8)', async () => {
    mockApi([reply(GET, { body: review({ roi: '-12.50' }) })]);
    renderPage();

    expect(await screen.findByLabelText('Post-investment ROI: -12.50 %')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tellus webinar series' })).toBeVisible();
    const figures = screen.getByRole('region', { name: 'Activity figures' });
    expect(within(figures).getByText('60,000.00 USD')).toBeInTheDocument();
    expect(within(figures).getByText('Actual')).toBeInTheDocument();
  });

  it('shows every problem the submit answers at once, each at its field (demo-mvp #7)', async () => {
    const empty = review({ businessCase: '', amountSpent: null, margin: null, roi: null });
    const api = mockApi([
      reply(GET, { body: empty }),
      reply(SUBMIT, {
        status: 400,
        body: apiError('validation_failed', 'Check the highlighted fields.', {
          fields: [
            { field: 'businessCase', message: 'Enter the business case.' },
            { field: 'amountSpent', message: 'Enter an amount spent above 0.00.' },
            { field: 'margin', message: 'Enter the margin.' },
          ],
        }),
      }),
    ]);
    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Submit review' }));

    expect(await screen.findByText('3 problems need your attention')).toBeInTheDocument();
    expect(screen.getAllByText('Enter the business case.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enter an amount spent above 0.00.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enter the margin.').length).toBeGreaterThan(0);
    // Nothing was changed, so nothing was saved first.
    expect(api.bodiesOf('PATCH /api/v1/post-investment-reviews/PIR-1001')).toEqual([]);
    expect(api.bodiesOf('POST /api/v1/post-investment-reviews/PIR-1001/submit')).toEqual([
      { version: 3 },
    ]);
  });

  it('saves only the changed fields with the version, and shows the ROI the server answers (demo-mvp #7)', async () => {
    const api = mockApi([
      reply(GET, { body: review() }),
      reply(PATCH, {
        body: review({ margin: { amount: '50000.00', currency: 'USD' }, roi: '53.34', version: 4 }),
      }),
    ]);
    const { user } = renderPage();

    const margin = await screen.findByRole('textbox', { name: /Margin/ });
    await user.clear(margin);
    await user.type(margin, '50000{Enter}');

    expect(await screen.findByLabelText('Post-investment ROI: 53.34 %')).toBeInTheDocument();
    expect(api.bodiesOf('PATCH /api/v1/post-investment-reviews/PIR-1001')).toEqual([
      { version: 3, margin: { amount: '50000.00', currency: 'USD' } },
    ]);
  });

  it('keeps a Submitted review read-only (demo-mvp #7)', async () => {
    mockApi([
      reply(GET, {
        body: review({
          status: 'submitted',
          submittedAt: '2026-11-04T11:00:00Z',
          remarks: 'On plan.',
        }),
      }),
    ]);
    renderPage();

    expect(await screen.findByText('Submitted reviews are read-only.')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('BC-2026-014')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('says so when the review is gone or outside the person’s plans (demo-mvp #7)', async () => {
    mockApi([reply(GET, { status: 404, body: apiError('not_found', 'No such review.') })]);
    renderPage();

    expect(
      await screen.findByText(
        'This post-investment review no longer exists — someone may have deleted it.',
      ),
    ).toBeInTheDocument();
  });
});
