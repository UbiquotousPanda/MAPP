import { useCallback, useLayoutEffect, useRef } from 'react';
import { createSearchParams, useSearchParams } from 'react-router';
import type { NavigateOptions, URLSearchParamsInit } from 'react-router';

export type AddressChange =
  URLSearchParamsInit | ((latest: URLSearchParams) => URLSearchParamsInit);

// React Router's updater gets its render's address: a second change before a re-render lost the first.
export function useAddressParams(): [
  URLSearchParams,
  (change: AddressChange, options?: NavigateOptions) => void,
] {
  const [params, setParams] = useSearchParams();
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const set = useCallback(
    (change: AddressChange, options?: NavigateOptions) => {
      const next = createSearchParams(
        typeof change === 'function' ? change(new URLSearchParams(latest.current)) : change,
      );
      latest.current = next;
      setParams(next, options);
    },
    [setParams],
  );
  return [params, set];
}
