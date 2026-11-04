import { useSearchParams } from 'react-router';

/** A report's address written in place: a control never scrolls the page to the top or adds a Back step. */
export function useReportParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const [params, setParams] = useSearchParams();
  const write = (next: URLSearchParams) =>
    setParams(next, { preventScrollReset: true, replace: true });
  return [params, write];
}
