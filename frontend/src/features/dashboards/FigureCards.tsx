import { useFormatters } from '@/format/useFormatters';
import { StatStrip } from '@/ui/StatStrip/StatStrip';
import { SummaryCard } from '@/ui/SummaryCard/SummaryCard';
import type { DashboardFigures } from './api';
import { FINANCE_HIDDEN, percentText } from './dashboard-text';

interface FigureCardsProps {
  figures: DashboardFigures;
}

export function FigureCards({ figures }: FigureCardsProps) {
  const { money } = useFormatters();
  const overspent = figures.leftToPlan !== null && figures.leftToPlan.amount.startsWith('-');
  const cards = [
    { label: 'Budget', value: money(figures.budget), note: figures.budget ? '' : 'No budget set' },
    {
      label: 'Planned cost',
      value: money(figures.plannedCost),
      note: figures.overBudget
        ? 'Over budget'
        : `Budget used ${percentText(figures.budgetUsedPercent)}`,
      problem: figures.overBudget,
    },
    {
      label: 'Left to plan',
      value: money(figures.leftToPlan),
      note: overspent ? 'Planned cost is over the budget' : '',
      problem: overspent,
    },
    {
      label: 'Committed',
      value: money(figures.committed),
      note: figures.committed ? '' : FINANCE_HIDDEN,
    },
    {
      label: 'Actual (paid)',
      value: money(figures.actual),
      note: figures.actual
        ? `Budget spent ${percentText(figures.budgetSpentPercent)}`
        : FINANCE_HIDDEN,
    },
    { label: 'Unspent budget', value: money(figures.unspentBudget), note: '' },
  ];
  return (
    <StatStrip label="Summary">
      {cards.map((card) => (
        <SummaryCard
          key={card.label}
          label={card.label}
          value={card.value}
          tone={card.problem ? 'problem' : undefined}
          detail={card.note}
        />
      ))}
    </StatStrip>
  );
}
