import type { components } from '@/api/generated/schema';
import { localDate } from '@/format/intl';

type ProjectionStamp = components['schemas']['ProjectionStamp'];

export function projectionLine(stamp: ProjectionStamp | null, date: (day: string) => string) {
  if (!stamp) return undefined;
  return `Projected from ${stamp.modelName}, last changed ${date(localDate(stamp.modelChangedAt))}.`;
}
