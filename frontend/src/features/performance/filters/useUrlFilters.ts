import { useSearchParams } from 'react-router';

export interface UrlFilters {
  values: Record<string, string | undefined>;
  set: (name: string, value: string) => void;
  /** Several filters in one change of the address. */
  setEach: (values: Record<string, string>) => void;
  clear: () => void;
  inUse: boolean;
}

/** The filters of a list, kept in the page address so Back and shared links keep them. */
export function useUrlFilters(names: readonly string[]): UrlFilters {
  const [params, setParams] = useSearchParams();
  const entries = names.map((name): [string, string] => [name, params.get(name) ?? '']);
  const values: Record<string, string | undefined> = Object.fromEntries(entries);
  function update(changes: [string, string][]) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [name, value] of changes) {
          if (value) {
            next.set(name, value);
          } else {
            next.delete(name);
          }
        }
        return next;
      },
      { replace: true },
    );
  }
  return {
    values,
    set: (name, value) => update([[name, value]]),
    setEach: (values) => update(Object.entries(values)),
    clear: () => update(names.map((name) => [name, ''])),
    inUse: entries.some(([, value]) => value !== ''),
  };
}
