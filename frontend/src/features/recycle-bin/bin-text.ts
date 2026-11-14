// The words of the recycle bin page: each row's texts, the search over contents, the type pills.
import type { components } from '@/api/generated/schema';
import { joinWithAnd } from '@/format/text';
import type { ListNoun } from '@/ui/ResultCount/count-text';

export type BinItem = components['schemas']['RecycleBinListItem'];
export type BinRecord = components['schemas']['RecycleBinRecord'];
export type ContentCount = components['schemas']['ContentCount'];
export type RecordRef = components['schemas']['RecordRef'];

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titled(typeLabel: string, name: string): string {
  return `${capitalise(typeLabel)} '${name}'`;
}

export const EMPTY_BIN_TEXT =
  'When you delete a plan, campaign, initiative, activity or line item, it comes here so you can bring it back.';

export function contentsText(contents: ContentCount[]): string {
  return joinWithAnd(contents.map((content) => `${content.count} ${content.label}`));
}

export function rowContentsText(contents: ContentCount[]): string {
  return contents.length > 0
    ? contents.map((content) => `${content.count} ${content.label}`).join(' · ')
    : 'Nothing inside';
}

export function wasInText(path: RecordRef[]): string {
  return path.length > 0 ? `Was in ${path.map((record) => record.name).join(' › ')}` : '';
}

/** Why a row cannot simply come back (FR-017); '' when it can. */
export function restoreStateLine(item: BinItem): string {
  const parent = item.missingParent;
  if (!parent) {
    return '';
  }
  switch (item.restoreState) {
    case 'parentInRecycleBin':
      return `Its ${parent.typeLabel} '${parent.name}' is also in the recycle bin`;
    case 'parentDeletedPermanently':
      return `Can't be restored — its ${parent.typeLabel} '${parent.name}' was permanently deleted`;
    default:
      return '';
  }
}

export interface SearchMatch {
  matches: boolean;
  containsText: string;
}

/** The search on name or ID looks at the entry's record and every record inside it. */
export function matchSearch(item: BinItem, search: string): SearchMatch {
  const query = search.trim().toLowerCase();
  if (!query) {
    return { matches: true, containsText: '' };
  }
  const hit = (name: string, id: string) =>
    name.toLowerCase().includes(query) || id.toLowerCase().includes(query);
  if (hit(item.recordName, item.recordId)) {
    return { matches: true, containsText: '' };
  }
  const [first, ...others] = insideRecords(item).filter((record) =>
    hit(record.recordName, record.recordId),
  );
  if (!first) {
    return { matches: false, containsText: '' };
  }
  const more = others.length > 0 ? ` and ${others.length} more` : '';
  return { matches: true, containsText: `Contains ${first.recordId} '${first.recordName}'${more}` };
}

export function insideRecords(item: BinItem): BinRecord[] {
  return (item.records ?? []).filter((record) => record.recordId !== item.recordId);
}

export function holdsRecord(item: BinItem, recordId: string): boolean {
  return item.recordId === recordId || insideRecords(item).some((r) => r.recordId === recordId);
}

export function typePills(items: BinItem[]): { value: string; label: string }[] {
  const pills = [
    { value: 'all', label: 'All' },
    { value: 'plan', label: 'Plans' },
    { value: 'campaign', label: 'Campaigns' },
    { value: 'initiative', label: 'Initiatives' },
    { value: 'activity', label: 'Activities' },
    { value: 'lineItem', label: 'Line items' },
  ];
  for (const item of items) {
    if (!pills.some((pill) => pill.value === item.recordType)) {
      const pluralLabel = item.recordTypePlural ?? `${item.recordTypeLabel}s`;
      pills.push({ value: item.recordType, label: capitalise(pluralLabel) });
    }
  }
  return pills;
}

export const ITEMS: ListNoun = { one: 'item', many: 'items' };
