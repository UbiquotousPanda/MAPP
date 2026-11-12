import type { ActivityApproval } from './api';

type Offer = ActivityApproval['actions']['submit'];

/** The approval answer alone decides whether the activity can be submitted; undefined while loading. */
export function submitOffer(approval: ActivityApproval | undefined): Offer | undefined {
  if (!approval) return undefined;
  const { submit, resubmit } = approval.actions;
  return [submit, resubmit].find((offer) => offer.available || offer.reason !== '');
}
