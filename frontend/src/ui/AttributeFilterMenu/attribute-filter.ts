/** A Shell attribute a list can filter by, with its values. */
export interface AttributeGroup {
  id: string;
  label: string;
  level: string;
  values: { id: string; label: string; inactive?: boolean }[];
}

export interface AttributeSelection {
  attributeId: string;
  values: string[];
}

export const NOT_FILLED_IN = 'none';
export const NOT_FILLED_IN_LABEL = 'Not filled in';

export const LEVEL_LABELS: Record<string, string> = {
  plan: 'Plan',
  campaign: 'Campaign',
  initiative: 'Initiative',
  activity: 'Activity',
  lineItem: 'Line item',
};

export function withAttributeValues(
  filters: AttributeSelection[] | undefined,
  attributeId: string,
  values: string[],
): AttributeSelection[] {
  const others = (filters ?? []).filter((filter) => filter.attributeId !== attributeId);
  return values.length > 0 ? [...others, { attributeId, values }] : others;
}
