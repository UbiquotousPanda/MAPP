import type { RouteObject } from 'react-router';
import { PostInvestmentReviewPage, PostInvestmentReviewsPage } from './pages';
import { titled } from './route-helpers';

// Apart from routes.tsx only to keep that file within 300 lines; the API scopes each list.
export const POST_INVESTMENT_ROUTES: RouteObject[] = [
  {
    path: '/post-investment-reviews',
    element: <PostInvestmentReviewsPage />,
    ...titled('Post-investment reviews'),
  },
  {
    path: '/post-investment-reviews/:reviewId',
    element: <PostInvestmentReviewPage />,
    ...titled('Post-investment review'),
  },
];
