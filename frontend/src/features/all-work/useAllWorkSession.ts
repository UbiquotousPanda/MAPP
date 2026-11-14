import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useCurrentUser } from '@/session/useSession';
import { useToast } from '@/ui/Toast/useToast';
import { fetchOptionsOf, useAllWorkOptions, useAllWorkPreferences, useSavedViews } from './api';
import { useAllWorkState } from './all-work-store';
import type { AllWorkEntry } from './all-work-store';
import { leftOutMessage } from './all-work-text';
import type { SavedView, ViewState } from './all-work-types';
import { addressOf, fromAddress, hasAddressFilters } from './schemas';
import { leftOutOf, standardState, yearRange } from './view-state';
import type { PageSize } from './view-state';

const SYNCED = { allWorkAddress: true };

function isSynced(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'allWorkAddress' in state;
}

export type StateChange = ViewState | ((current: ViewState) => ViewState);

export interface AllWorkSession {
  state: ViewState | null;
  entry: AllWorkEntry;
  /** The page goes back to 1 unless `keepPage`. */
  setState: (next: StateChange, options?: { keepPage?: boolean }) => void;
  /** What no longer exists is left out and named in a message. */
  applyView: (view: SavedView) => Promise<void>;
  setAppliedView: (viewId: string | null) => void;
  applyStandard: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: PageSize) => void;
  rememberScroll: () => void;
  startError: unknown;
  retryStart: () => void;
}

/**
 * Starts from the filters in the address, else the default saved view, else the standard view; then
 * keeps the state while the person moves around and writes it back into the address.
 */
export function useAllWorkSession(): AllWorkSession {
  const user = useCurrentUser();
  const [entry, update] = useAllWorkState(user.id);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { show } = useToast();
  // An address the page wrote itself already shows; any other one with filters is a link to apply.
  const fromLink =
    hasAddressFilters(new URLSearchParams(location.search)) && !isSynced(location.state);
  const starting = !entry.initialized || fromLink;
  const address = starting || !entry.state ? null : `?${addressOf(entry.state)}`;
  const preferences = useAllWorkPreferences();
  const current = useAllWorkOptions(null, starting);
  const views = useSavedViews();

  const fitted = useCallback(
    async (view: SavedView) => {
      try {
        return leftOutOf(
          view.state,
          await fetchOptionsOf(queryClient, view.state.year, yearRange(view.state).to),
        );
      } catch {
        // The choices could not be read: the API leaves unknown values out itself.
        return { state: view.state, names: [] };
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!starting || !preferences.data || !current.data || !views.data) {
      return;
    }
    const standard = standardState(preferences.data, current.data.currentYear);
    const params = new URLSearchParams(location.search);
    const start = { initialized: true, page: 1, scrollY: 0 };
    if (hasAddressFilters(params)) {
      const state = fromAddress(params, standard);
      update({ ...start, state, appliedViewId: null });
      void navigate(`?${addressOf(state)}`, { replace: true, state: SYNCED });
      return;
    }
    const defaultView = views.data.items.find((view) => view.isDefault);
    if (!defaultView) {
      update({ ...start, state: standard, appliedViewId: null });
      return;
    }
    let cancelled = false;
    void fitted(defaultView).then(({ state, names }) => {
      if (cancelled) return;
      update({ ...start, state, appliedViewId: defaultView.id });
      if (names.length > 0) show({ message: leftOutMessage(names) });
    });
    return () => {
      cancelled = true;
    };
  }, [
    starting,
    preferences.data,
    current.data,
    views.data,
    location.search,
    navigate,
    update,
    fitted,
    show,
  ]);

  useEffect(() => {
    if (address !== null && address !== location.search) {
      void navigate(address, { replace: true, state: SYNCED });
    }
  }, [address, location.search, navigate]);

  const setState = useCallback(
    (next: StateChange, { keepPage = false }: { keepPage?: boolean } = {}) =>
      update((entryNow) => ({
        state: typeof next === 'function' ? entryNow.state && next(entryNow.state) : next,
        ...(keepPage ? {} : { page: 1 }),
      })),
    [update],
  );

  const applyView = useCallback(
    async (view: SavedView) => {
      const { state, names } = await fitted(view);
      update({ state, appliedViewId: view.id, page: 1 });
      if (names.length > 0) show({ message: leftOutMessage(names) });
    },
    [fitted, update, show],
  );

  const startError = starting ? (preferences.error ?? current.error ?? views.error) : null;

  return {
    state: starting ? null : entry.state,
    entry,
    setState,
    applyView,
    setAppliedView: useCallback(
      (viewId: string | null) => update({ appliedViewId: viewId }),
      [update],
    ),
    applyStandard: () => {
      if (preferences.data && entry.state) {
        const year = current.data?.currentYear ?? entry.state.year;
        update({ state: standardState(preferences.data, year), appliedViewId: null, page: 1 });
      }
    },
    setPage: useCallback((page: number) => update({ page }), [update]),
    setPageSize: useCallback((pageSize: PageSize) => update({ pageSize, page: 1 }), [update]),
    rememberScroll: useCallback(() => update({ scrollY: window.scrollY }), [update]),
    startError,
    retryStart: () => {
      void preferences.refetch();
      void current.refetch();
      void views.refetch();
    },
  };
}
