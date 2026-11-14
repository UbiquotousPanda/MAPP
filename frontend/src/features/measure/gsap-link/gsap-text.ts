import type { GsapLinkReport, GsapPath, GsapWaitingRow } from './api';
import type { GsapTab } from './gsap-address';

export const TAB_LABELS: Record<GsapTab, string> = {
  swbs: 'Waiting for SWBS code',
  waiting: 'Waiting for GSAP',
  orders: 'Purchase orders',
};

/** Waiting in days, with hours under two days: "1 hour", "30 hours", "3 days". */
export function waitingText(hours: number): string {
  if (hours < 48) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${Math.floor(hours / 24)} days`;
}

// The API's bands end on their upper bound ("2 – 5 days" holds exactly 5 days), so each says where it starts.
const BAND_LABELS: Record<string, string> = {
  under48h: '48 hours or less',
  days2to5: 'Over 2 days, up to 5',
  days5to10: 'Over 5 days, up to 10',
  over10days: 'Over 10 days',
};

export function bandText(band: { key: string; label: string }): string {
  return BAND_LABELS[band.key] ?? band.label;
}

export function workingDaysText(days: number): string {
  return days === 1 ? '1 working day' : `${days} working days`;
}

/** Which plans the amounts cover: nothing to say when they cover every plan in view. */
export function coverageText(finance: GsapLinkReport['finance']): string | undefined {
  if (!finance || finance.plans === finance.of) {
    return undefined;
  }
  if (finance.plans === 0) {
    return "You can't see financial data";
  }
  return `Covers ${finance.plans} of ${finance.of} plans`;
}

export const ROUTING_LABELS: Record<GsapWaitingRow['routing'], string> = {
  original: 'Original',
  modification: 'Modification',
};

export function pathText(path: GsapPath): string {
  return [path.plan, path.campaign, path.initiative, path.activity].filter(Boolean).join(' › ');
}
