import { z } from 'zod';

export const TABLES = [
  { table: 'revenue', param: 'revenueBy' },
  { table: 'performance', param: 'performanceBy' },
  { table: 'cost', param: 'costBy' },
  { table: 'roi', param: 'roiBy' },
] as const;
export type LeagueTableKey = (typeof TABLES)[number]['table'];
type SegmentParam = (typeof TABLES)[number]['param'];

export type SummaryParams = {
  category: string;
  stage: '' | 'mql';
} & Record<SegmentParam, string>;

export const DEFAULT_PARAMS: SummaryParams = {
  category: '',
  stage: '',
  revenueBy: '',
  performanceBy: '',
  costBy: '',
  roiBy: '',
};

const idSchema = z.string().regex(/^[A-Za-z0-9-]{1,40}$/);

function pick<T>(params: URLSearchParams, name: string, schema: z.ZodType<T>, fallback: T): T {
  const parsed = schema.safeParse(params.get(name) ?? undefined);
  return parsed.success ? parsed.data : fallback;
}

export function readSummaryParams(params: URLSearchParams): SummaryParams {
  return {
    category: pick(params, 'category', z.string().regex(/^(CAT-[0-9]+|uncategorised)$/), ''),
    stage: pick(params, 'stage', z.enum(['mql']), ''),
    revenueBy: pick(params, 'revenueBy', idSchema, ''),
    performanceBy: pick(params, 'performanceBy', idSchema, ''),
    costBy: pick(params, 'costBy', idSchema, ''),
    roiBy: pick(params, 'roiBy', idSchema, ''),
  };
}

/** The address with the report's own parameters set; an empty value is left out, so the address stays short. */
export function writeSummaryParams(params: URLSearchParams, next: SummaryParams): URLSearchParams {
  const written = new URLSearchParams(params);
  const own: [string, string][] = [
    ['category', next.category],
    ['stage', next.stage],
    ...TABLES.map(({ param }): [string, string] => [param, next[param]]),
  ];
  for (const [name, value] of own) {
    written.delete(name);
    if (value !== '') {
      written.set(name, value);
    }
  }
  return written;
}
