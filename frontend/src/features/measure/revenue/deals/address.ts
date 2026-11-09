import { useSearchParams } from 'react-router';
import type { AttributionModel } from './api';

export const DEALS_PARAM = 'deals';
export const COMPARE_PARAM = 'compare';

const MODELS: readonly AttributionModel[] = [
  'firstTouch',
  'lastTouch',
  'equallyDistributed',
  'linearTimeDecay',
  'uShaped',
];

export function isModel(value: string | null): value is AttributionModel {
  return MODELS.some((m) => m === value);
}

export interface DealsAddress {
  activityId: string | null;
  compare: AttributionModel | null;
}

/** The open panel lives in the address; opening pushes and closing replaces, so Back closes it and never reopens it. */
export function useDealsAddress(): {
  address: DealsAddress;
  open: (activityId: string) => void;
  compare: (model: AttributionModel | null) => void;
  close: () => void;
} {
  const [params, setParams] = useSearchParams();
  const rawCompare = params.get(COMPARE_PARAM);
  const address: DealsAddress = {
    activityId: params.get(DEALS_PARAM),
    compare: isModel(rawCompare) ? rawCompare : null,
  };
  const change = (edit: (next: URLSearchParams) => void, replace: boolean) => {
    const next = new URLSearchParams(params);
    edit(next);
    setParams(next, { replace });
  };
  return {
    address,
    open: (activityId) => change((next) => next.set(DEALS_PARAM, activityId), false),
    compare: (model) =>
      change((next) => {
        if (model) {
          next.set(COMPARE_PARAM, model);
        } else {
          next.delete(COMPARE_PARAM);
        }
      }, true),
    close: () =>
      change((next) => {
        next.delete(DEALS_PARAM);
        next.delete(COMPARE_PARAM);
      }, true),
  };
}
