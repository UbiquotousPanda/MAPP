import { useState } from 'react';

/** The record as opened, moved only by the person's own save or the latest after a conflict. */
export function useEditedRecord<T extends { version: number }>(opened: T) {
  const [record, keep] = useState(opened);

  async function loadLatest(load: () => Promise<T | undefined>) {
    const latest = await load().catch(() => undefined);
    if (latest) {
      keep(latest);
    }
  }

  return { record, version: record.version, keep, loadLatest };
}
