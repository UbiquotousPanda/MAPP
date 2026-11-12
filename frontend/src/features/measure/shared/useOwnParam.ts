import { useAddressParams } from '@/ui/useAddressParams';

/** One of the report's own parameters, kept in the address so saved views, Back and the export keep it. */
export function useOwnParam(name: string): [string, (value: string) => void] {
  const [params, setParams] = useAddressParams();
  const change = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    next.delete('page');
    setParams(next);
  };
  return [params.get(name) ?? '', change];
}
