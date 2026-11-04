import type { components } from '@/api/generated/schema';
import { localDate } from '@/format/intl';

type ProjectionStamp = components['schemas']['ProjectionStamp'];

/** Names every model behind the projected figures, each with its last change. */
export function projectionLine(stamps: ProjectionStamp[], date: (day: string) => string) {
  if (stamps.length === 0) return undefined;
  const named = stamps.map(
    (s) => `${s.modelName}, last changed ${date(localDate(s.modelChangedAt))}`,
  );
  return `Projected from ${named.join('; and ')}.`;
}
