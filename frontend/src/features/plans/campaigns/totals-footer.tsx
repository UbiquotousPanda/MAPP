import type { TreeTableFooter } from '@/ui/TreeTable/TreeTable';
import type { Formatters } from '@/format/useFormatters';
import { TotalLabel } from '@/ui/Table/TotalLabel';
import { AmountPair } from '../AmountPair';
import styles from './campaign-rows.module.css';
import type { PlanCampaigns } from './api';
import { ALLOCATED, totalsText } from './texts';

export function totalsFooter(data: PlanCampaigns, formatters: Formatters): TreeTableFooter {
  // Amounts in the plan currency, the reader's display currency beneath when it differs.
  const { totals, displayTotals } = data;
  return {
    name: (
      <TotalLabel count={totalsText(totals.campaigns, totals.initiatives, totals.activities)} />
    ),
    budget: (
      <span className={styles.money}>
        <AmountPair
          primary={totals.allocatedToCampaigns}
          secondary={displayTotals.allocatedToCampaigns}
        />
        <span className={styles.left}>{ALLOCATED}</span>
      </span>
    ),
    plannedCost: totals.plannedCost ? (
      <AmountPair primary={totals.plannedCost} secondary={displayTotals.plannedCost} />
    ) : (
      formatters.money(null)
    ),
  };
}
