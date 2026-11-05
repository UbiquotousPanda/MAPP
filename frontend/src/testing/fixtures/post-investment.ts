import type { HttpHandler } from 'msw';
import type { components } from '@/api/generated/schema';
import { reply } from '@/testing/replies';

type Review = components['schemas']['PostInvestmentReview'];

const AVAILABLE = { available: true, reason: '' };
const ALEX = { id: 'U-1001', name: 'Alex Morgan' };

/** A Draft review of Tellus webinar series, every action available; pass what a test changes. */
export function review(overrides: Partial<Review> = {}): Review {
  return {
    id: 'PIR-1001',
    activity: { id: 'A-1003', name: 'Tellus webinar series' },
    path: [
      { type: 'plan', id: 'P-1001', name: 'FY2026 Lubricants Europe' },
      { type: 'campaign', id: 'C-1001', name: 'Tellus launch' },
      { type: 'initiative', id: 'I-1001', name: 'Digital' },
    ],
    status: 'draft',
    businessCase: 'BC-2026-014',
    amountSpent: { amount: '32608.70', currency: 'USD' },
    margin: { amount: '44430.00', currency: 'USD' },
    roi: '36.25',
    remarks: '',
    figures: {
      budget: { amount: '60000.00', currency: 'USD' },
      planned: { amount: '35000.00', currency: 'USD' },
      committed: { amount: '33000.00', currency: 'USD' },
      actual: { amount: '32608.70', currency: 'USD' },
    },
    submittedAt: null,
    submittedBy: null,
    access: { edit: AVAILABLE, submit: AVAILABLE, delete: AVAILABLE, export: AVAILABLE },
    version: 3,
    createdAt: '2026-11-02T09:00:00Z',
    createdBy: ALEX,
    updatedAt: '2026-11-04T10:30:00Z',
    updatedBy: ALEX,
    ...overrides,
  };
}

/** The activity page's review card with no review yet, for tests about the rest of the page. */
export function noActivityReview(): HttpHandler {
  return reply('GET /api/v1/post-investment-reviews', {
    body: { items: [], export: AVAILABLE },
  });
}
