import type { components } from '@/api/generated/schema';
import { toCents } from '@/format/decimal';
import type { LineItem, LineItemFormOptions } from './api';
import {
  amountText,
  centsInput,
  convert,
  customGridMonths,
  parseAmount,
  splitEvenly,
  spreadMonths,
} from './line-item-math';
import type { ActivityDates, SpreadMethod } from './line-item-math';
import {
  changedToText,
  NO_COST_TO_PREFILL,
  NOTHING_LEFT,
  preselectedText,
  ROUNDING_HINT,
  PLANNED_COST_SOURCE,
} from './line-item-text';

type AttributeValues = components['schemas']['AttributeValues'];
type FinanceBudgetItemRef = components['schemas']['FinanceBudgetItemRef'];
type LineItemCurrency = components['schemas']['LineItemCurrency'];

export interface CustomMonth {
  month: string;
  /** What is typed; "" for nothing. */
  amount: string;
}

export const SOURCE_FIELDS = ['plannedCost', 'financeBudgetItemId'] as const;

export type SourceField = (typeof SOURCE_FIELDS)[number];

export interface LineItemFormState {
  name: string;
  /** A person id; "" for nobody. */
  ownerId: string;
  description: string;
  currency: string;
  plannedCost: string;
  /** The pre-filled balance in the plan currency while the planned cost still holds it; null once typed. */
  prefilled: string | null;
  /** "Changed to 18,400.00 EUR = 20,000.00 USD", and the rounding hint when needed. */
  costNotes: string[];
  spreadMethod: SpreadMethod;
  /** The custom grid; kept when another method is chosen, so choosing Custom again restores it. */
  customMonths: CustomMonth[];
  /** The custom amounts were typed (or saved): leaving Custom replaces them (D-151). */
  customTyped: boolean;
  attributes: AttributeValues;
  contractedAmount: string;
  requestSwbs: boolean;
  financeBudgetYear: number | null;
  /** "" for none. */
  financeBudgetItemId: string;
  /** The item a year change will clear on save, with the note at the field (D-151). */
  clearedItem: FinanceBudgetItemRef | null;
  sources: Partial<Record<SourceField, string>>;
}

export function newFormState(options: LineItemFormOptions): LineItemFormState {
  const { defaults } = options;
  const preselected = defaults.financeBudgetItemPreselected
    ? options.financeBudgetItems.find((item) => item.id === defaults.financeBudgetItemId)
    : undefined;
  const sources: LineItemFormState['sources'] = {
    plannedCost:
      defaults.plannedCostSource === 'unassignedBalance'
        ? PLANNED_COST_SOURCE
        : defaults.plannedCostSource === 'nothingLeftToAssign'
          ? NOTHING_LEFT
          : NO_COST_TO_PREFILL,
  };
  if (preselected) {
    sources.financeBudgetItemId = preselectedText(preselected.budgetName);
  }
  return {
    name: defaults.name,
    ownerId: defaults.owner?.id ?? '',
    description: '',
    currency: defaults.currency,
    plannedCost: defaults.plannedCost ? centsInput(toCents(defaults.plannedCost.amount)) : '',
    prefilled: defaults.plannedCost?.amount ?? null,
    costNotes: [],
    spreadMethod: defaults.spreadMethod,
    customMonths: [],
    customTyped: false,
    attributes: {},
    contractedAmount: '',
    requestSwbs: defaults.requestSwbs,
    financeBudgetYear: defaults.financeBudgetYear,
    financeBudgetItemId: defaults.financeBudgetItemId ?? '',
    clearedItem: null,
    sources,
  };
}

export function editFormState(lineItem: LineItem): LineItemFormState {
  const custom = lineItem.spread.method === 'custom';
  return {
    name: lineItem.name,
    ownerId: lineItem.owner?.id ?? '',
    description: lineItem.description,
    currency: lineItem.currency.code,
    plannedCost: centsInput(toCents(lineItem.plannedCost.amount)),
    prefilled: null,
    costNotes: [],
    spreadMethod: lineItem.spread.method,
    customMonths: custom
      ? lineItem.spread.months.map(({ month, amount }) => ({
          month,
          amount: centsInput(toCents(amount.amount)),
        }))
      : [],
    customTyped: custom,
    attributes: lineItem.attributes,
    contractedAmount: lineItem.contractedAmount
      ? centsInput(toCents(lineItem.contractedAmount.amount))
      : '',
    requestSwbs: lineItem.requestSwbs,
    financeBudgetYear: lineItem.financeBudgetYear,
    financeBudgetItemId: lineItem.financeBudgetItem?.id ?? '',
    clearedItem: null,
    sources: {},
  };
}

/** The state with one field changed by the person: its source note goes. */
export function withField<K extends keyof LineItemFormState>(
  state: LineItemFormState,
  field: K,
  value: LineItemFormState[K],
): LineItemFormState {
  const sources = { ...state.sources };
  const source = SOURCE_FIELDS.find((name) => name === field);
  if (source) {
    delete sources[source];
  }
  return { ...state, [field]: value, sources };
}

export function changePlannedCost(state: LineItemFormState, text: string): LineItemFormState {
  return { ...withField(state, 'plannedCost', text), prefilled: null, costNotes: [] };
}

/** A pre-filled balance is converted so its plan-currency value stays the balance, and the form says so. */
export function changeCurrency(
  state: LineItemFormState,
  code: string,
  currencies: LineItemCurrency[],
  planCode = 'USD',
): LineItemFormState {
  const next = withField(state, 'currency', code);
  const currency = currencies.find((candidate) => candidate.code === code);
  const planRate = rateOf(currencies, planCode);
  if (state.prefilled === null || !currency || planRate === null) {
    return next;
  }
  const balance = toCents(state.prefilled);
  const local = convert(balance, planRate, currency.ratePerUsd);
  const back = convert(local, currency.ratePerUsd, planRate);
  const notes =
    code === planCode ? [] : [changedToText(amountText(local, code), amountText(back, planCode))];
  if (code !== planCode && back !== balance) {
    notes.push(ROUNDING_HINT);
  }
  return { ...next, plannedCost: centsInput(local), costNotes: notes };
}

export function rateOf(currencies: LineItemCurrency[], code: string): string | null {
  if (code === 'USD') {
    return '1';
  }
  return currencies.find((candidate) => candidate.code === code)?.ratePerUsd ?? null;
}

/** Custom starts from the current spread (even when none yet), unless the grid already has amounts (D-152). */
export function changeSpreadMethod(
  state: LineItemFormState,
  method: SpreadMethod,
  dates: ActivityDates,
  planYear: number,
): LineItemFormState {
  const next = withField(state, 'spreadMethod', method);
  if (method !== 'custom' || state.customMonths.length > 0) {
    return next;
  }
  const months = customGridMonths(dates, planYear);
  const cents = parseAmount(state.plannedCost) ?? 0n;
  const current =
    state.spreadMethod === 'custom' ? null : spreadMonths(state.spreadMethod, cents, dates);
  const amounts =
    current && current.state === 'spread' ? current.months : splitEvenly(cents, months);
  return {
    ...next,
    customMonths: months.map((month) => {
      const amount = amounts.find((candidate) => candidate.month === month);
      return { month, amount: amount ? centsInput(amount.cents) : '' };
    }),
  };
}

export function changeCustomMonth(
  state: LineItemFormState,
  month: string,
  amount: string,
): LineItemFormState {
  return {
    ...state,
    customTyped: true,
    customMonths: state.customMonths.map((candidate) =>
      candidate.month === month ? { month, amount } : candidate,
    ),
  };
}

export function addCustomMonth(state: LineItemFormState, month: string): LineItemFormState {
  const months = [...state.customMonths, { month, amount: '' }].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  return { ...state, customTyped: true, customMonths: months };
}

/** An item of another year is cleared on save and the field says so; its own year brings it back (D-151). */
export function changeBudgetYear(
  state: LineItemFormState,
  year: number | null,
  items: FinanceBudgetItemRef[],
): LineItemFormState {
  const next = withField(state, 'financeBudgetYear', year);
  delete next.sources.financeBudgetItemId;
  if (state.clearedItem && state.clearedItem.year === year) {
    return { ...next, financeBudgetItemId: state.clearedItem.id, clearedItem: null };
  }
  const chosen = items.find((item) => item.id === state.financeBudgetItemId);
  if (chosen && chosen.year !== year) {
    return { ...next, financeBudgetItemId: '', clearedItem: chosen };
  }
  return next;
}

export function monthFieldId(month: string): string {
  return `spread.month.${month}`;
}
