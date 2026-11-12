import type { components } from '@/api/generated/schema';
import { formatAmount, toCents } from '@/format/decimal';
import type { LineItem, LineItemFormOptions } from './api';
import { centsInput, customGridMonths, moneyText } from './line-item-math';
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
type Money = components['schemas']['Money'];
type SpreadMonthInput = components['schemas']['SpreadMonthInput'];

export interface CustomMonth {
  month: string;
  amount: string;
}

export const SOURCE_FIELDS = ['plannedCost', 'financeBudgetItemId'] as const;

export type SourceField = (typeof SOURCE_FIELDS)[number];

export interface LineItemFormState {
  name: string;
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
  /** The custom amounts were typed (or saved): leaving Custom replaces them. */
  customTyped: boolean;
  attributes: AttributeValues;
  contractedAmount: string;
  requestSwbs: boolean;
  financeBudgetYear: number | null;
  financeBudgetItemId: string;
  /** The item a year change will clear on save, with the note at the field. */
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

/** Choosing a currency keeps a pre-filled balance pre-filled: withBalance converts it once the API answers. */
export function changeCurrency(state: LineItemFormState, code: string): LineItemFormState {
  return withField(state, 'currency', code);
}

/** The API's balance in the chosen currency, with its note; unchanged once typed over or already shown. */
export function withBalance(
  state: LineItemFormState,
  balanceIn: Money | null | undefined,
  balanceInPlan: Money | null | undefined,
): LineItemFormState {
  if (state.prefilled === null || !balanceIn || !balanceInPlan) {
    return state;
  }
  const cost = formatAmount(balanceIn.amount);
  if (balanceIn.currency !== state.currency || cost === state.plannedCost) {
    return state;
  }
  const notes =
    balanceIn.currency === balanceInPlan.currency
      ? []
      : [changedToText(moneyText(balanceIn), moneyText(balanceInPlan))];
  if (notes.length > 0 && balanceInPlan.amount !== state.prefilled) {
    notes.push(ROUNDING_HINT);
  }
  return { ...state, plannedCost: cost, costNotes: notes };
}

export function rateOf(currencies: LineItemCurrency[], code: string): string | null {
  if (code === 'USD') {
    return '1';
  }
  return currencies.find((candidate) => candidate.code === code)?.ratePerUsd ?? null;
}

/** Custom starts from the API's seed of the current spread, unless the grid already has amounts. */
export function changeSpreadMethod(
  state: LineItemFormState,
  method: SpreadMethod,
  dates: ActivityDates,
  planYear: number,
  seed: SpreadMonthInput[] = [],
): LineItemFormState {
  const next = withField(state, 'spreadMethod', method);
  if (method !== 'custom' || state.customMonths.length > 0) {
    return next;
  }
  return {
    ...next,
    customMonths: customGridMonths(dates, planYear).map((month) => {
      const amount = seed.find((candidate) => candidate.month === month);
      return { month, amount: amount ? formatAmount(amount.amount) : '' };
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

/** An item of another year is cleared on save and the field says so; its own year brings it back. */
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
