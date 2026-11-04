import { useState } from 'react';

const STORAGE_KEY = 'mapp.reports.liveFilters';

export const LIVE_DELAY_MS = 400;

export const LIVE_LABEL = 'Update as I choose';

export function readLiveFilters(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function storeLiveFilters(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage can be blocked (private windows, strict settings): the switch then starts off next time.
  }
}

/** Whether this viewer's filters apply as they are chosen: off until switched on, remembered in this browser. */
export function useLiveFilters(): [boolean, (on: boolean) => void] {
  const [live, setLive] = useState(readLiveFilters);
  const update = (on: boolean) => {
    storeLiveFilters(on);
    setLive(on);
  };
  return [live, update];
}
