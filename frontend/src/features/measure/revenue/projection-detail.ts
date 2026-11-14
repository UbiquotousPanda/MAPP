import type { RevenueReport } from './api';

/** Which models project the figure, in one short line; the full provenance is in the card's tip. */
export function modelsLine(stamps: RevenueReport['projections']): string | undefined {
  if (stamps.length < 2) return stamps[0] && `From ${stamps[0].modelName}`;
  return `From ${stamps.length} projection models`;
}

const PROJECTED = 'Actual to the end of last period, projected from today.';

export function projectedTip(provenance: string | undefined): string {
  return provenance ? `${PROJECTED} ${provenance}` : PROJECTED;
}
