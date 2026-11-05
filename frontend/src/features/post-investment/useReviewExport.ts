import { useState } from 'react';
import { ApiError, isSessionLost } from '@/api/errors';
import { useToast } from '@/ui/Toast/useToast';

/** Runs a PowerPoint download, says which file was saved and keeps the button busy meanwhile. */
export function useReviewExport(download: () => Promise<string>) {
  const { show } = useToast();
  const [preparing, setPreparing] = useState(false);

  async function run() {
    if (preparing) {
      return;
    }
    setPreparing(true);
    try {
      const fileName = await download();
      show({ message: `Exported '${fileName}'` });
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('other');
      if (!isSessionLost(failure)) {
        show({ message: failure.message });
      }
    } finally {
      setPreparing(false);
    }
  }

  return { run: () => void run(), preparing };
}
