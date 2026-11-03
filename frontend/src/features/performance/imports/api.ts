import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, call } from '@/api/client';
import type { components, operations } from '@/api/generated/schema';
import { performanceKeys } from '../api';

type Schemas = components['schemas'];
export type PerformanceImport = Schemas['PerformanceImport'];
export type PerformanceCounts = Schemas['PerformanceCounts'];
export type PerformanceUpload = Schemas['PerformanceUpload'];
export type ImportFilters = NonNullable<
  operations['listPerformanceImports']['parameters']['query']
>;
export type ImportStatus = PerformanceImport['status'];

export const importKeys = {
  all: ['performance', 'imports'] as const,
  list: (filters: ImportFilters) => ['performance', 'imports', 'list', filters] as const,
  one: (id: string) => ['performance', 'imports', id] as const,
};

export function useImports(filters: ImportFilters) {
  return useQuery({
    queryKey: importKeys.list(filters),
    queryFn: () => call(api.GET('/api/v1/performance/imports', { params: { query: filters } })),
    placeholderData: keepPreviousData,
  });
}

export function useImport(importId: string) {
  return useQuery({
    queryKey: importKeys.one(importId),
    queryFn: () =>
      call(api.GET('/api/v1/performance/imports/{importId}', { params: { path: { importId } } })),
  });
}

/** Everything a load can change: its list, the sources' freshness and the rows to review. */
function useAfterLoad() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: importKeys.all }),
      queryClient.invalidateQueries({ queryKey: performanceKeys.sources }),
      queryClient.invalidateQueries({ queryKey: ['performance', 'review-rows'] }),
    ]);
}

export function useUploadFile() {
  const afterLoad = useAfterLoad();
  return useMutation({
    mutationFn: ({ sourceId, body }: { sourceId: string; body: PerformanceUpload }) =>
      call(
        api.POST('/api/v1/performance/sources/{sourceId}/uploads', {
          params: { path: { sourceId } },
          body,
        }),
      ),
    onSuccess: afterLoad,
  });
}

export function usePullFeed() {
  const afterLoad = useAfterLoad();
  return useMutation({
    mutationFn: (sourceId: string) =>
      call(
        api.POST('/api/v1/performance/sources/{sourceId}/pull', {
          params: { path: { sourceId } },
        }),
      ),
    onSuccess: afterLoad,
  });
}

export function useUndoImport(importId: string) {
  const afterLoad = useAfterLoad();
  return useMutation({
    mutationFn: () =>
      call(
        api.POST('/api/v1/performance/imports/{importId}/undo', {
          params: { path: { importId } },
        }),
      ),
    onSuccess: afterLoad,
  });
}
