export type Stage = 'revenue' | 'mql' | 'inq';

const STAGES: readonly Stage[] = ['revenue', 'mql', 'inq'];

/** The stage the address asks for; one no longer offered opens Revenue and is flagged, so the page can say so. */
export function stageOf(param: string): { stage: Stage; unknown: boolean } {
  const stage = STAGES.find((s) => s === param);
  return { stage: stage ?? 'revenue', unknown: param !== '' && stage === undefined };
}
