import type { ColumnMapping } from '../api';
import type { CorrectInput } from './api';

type KeyType = Exclude<ColumnMapping['keyType'], ''>;

export interface CorrectableField {
  column: string;
  hint: string;
  part: 'date' | 'currency' | 'key' | 'value';
  keyType?: KeyType;
}

const KEY_HINTS: Record<KeyType, string> = {
  activityId: 'The activity ID this row is for, such as A-1042.',
  mediaCode: 'The media code carried in the campaign link.',
  integrationId: 'The data source’s own ID for the activity.',
  externalName: 'The activity’s external name.',
};

/** The cells a correction may change, in the order of the source's columns. */
export function correctableFields(mappings: ColumnMapping[]): CorrectableField[] {
  return mappings.flatMap((m): CorrectableField[] => {
    if (m.meaning === 'factDate') {
      return [
        { column: m.columnName, part: 'date', hint: 'The date the figure is for, as YYYY-MM-DD.' },
      ];
    }
    if (m.meaning === 'currency') {
      return [{ column: m.columnName, part: 'currency', hint: 'A currency code such as USD.' }];
    }
    if (m.meaning === 'key' && m.keyType !== '') {
      return [
        { column: m.columnName, part: 'key', keyType: m.keyType, hint: KEY_HINTS[m.keyType] },
      ];
    }
    if (m.meaning === 'stage' || m.meaning === 'revenue' || m.meaning === 'webMetric') {
      return [{ column: m.columnName, part: 'value', hint: 'The figure this column carries.' }];
    }
    return [];
  });
}

/** Only what was changed is sent; keys go together, as the row carries them as one set. */
export function correctionOf(
  fields: CorrectableField[],
  raw: Record<string, string>,
  edited: Record<string, string>,
): Omit<CorrectInput, 'version'> | null {
  const changed = fields.filter((f) => (edited[f.column] ?? '') !== (raw[f.column] ?? ''));
  if (changed.length === 0) {
    return null;
  }
  const valueOf = (f: CorrectableField) => edited[f.column] ?? '';
  const input: Omit<CorrectInput, 'version'> = {};
  const date = changed.find((f) => f.part === 'date');
  const currency = changed.find((f) => f.part === 'currency');
  if (date) {
    input.date = valueOf(date);
  }
  if (currency) {
    input.currency = valueOf(currency);
  }
  if (changed.some((f) => f.part === 'key')) {
    input.keys = {};
    for (const f of fields) {
      if (f.part === 'key' && f.keyType) {
        input.keys[f.keyType] = valueOf(f);
      }
    }
  }
  const values = changed.filter((f) => f.part === 'value');
  if (values.length > 0) {
    input.values = values.map((f) => ({ column: f.column, value: valueOf(f) }));
  }
  return input;
}
