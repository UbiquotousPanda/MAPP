import { useState } from 'react';
import { z } from 'zod';

const STORAGE_KEY = 'mapp.reports.openGroups';
const schema = z.record(z.string(), z.boolean());

function readOpenGroups(): Record<string, boolean> {
  try {
    return schema.parse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

function storeOpenGroup(key: string, open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readOpenGroups(), [key]: open }));
  } catch {
    // Storage can be blocked: the group then opens as it does by default next time.
  }
}

/** Whether a filter group is open: as this viewer last left it in this browser, else `defaultOpen`. */
export function useOpenGroup(
  key: string,
  defaultOpen: boolean,
): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => readOpenGroups()[key] ?? defaultOpen);
  const update = (next: boolean) => {
    storeOpenGroup(key, next);
    setOpen(next);
  };
  return [open, update];
}
