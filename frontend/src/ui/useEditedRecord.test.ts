import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEditedRecord } from './useEditedRecord';

describe('useEditedRecord', () => {
  it('keeps the version the person opened when a refetch brings a newer one', () => {
    const { result, rerender } = renderHook(({ live }) => useEditedRecord(live), {
      initialProps: { live: { version: 3 } },
    });

    rerender({ live: { version: 4 } });

    expect(result.current.version).toBe(3);
  });

  it('moves to the version of their own save, or to the latest after a conflict when it loads', async () => {
    const { result } = renderHook(() => useEditedRecord({ version: 3 }));

    act(() => result.current.keep({ version: 4 }));
    await act(() => result.current.loadLatest(() => Promise.reject(new Error('offline'))));
    expect(result.current.version).toBe(4);
    await act(() => result.current.loadLatest(() => Promise.resolve({ version: 6 })));

    expect(result.current.version).toBe(6);
  });
});
