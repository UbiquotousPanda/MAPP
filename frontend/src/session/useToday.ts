import { useSession } from './useSession';

/** The server's date (CurrentUser.today), never the browser's clock; "" until the session has loaded. */
export function useToday(): string {
  return useSession().user?.today ?? '';
}

export function useCurrentYear(): number {
  const today = useToday();
  return today ? Number(today.slice(0, 4)) : new Date().getFullYear();
}
