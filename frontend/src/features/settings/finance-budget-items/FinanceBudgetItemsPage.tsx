import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useAddressParams } from '@/ui/useAddressParams';
import { Button } from '@/ui/Button/Button';
import { CanChange, SettingsViewOnlyNote } from '@/ui/CanChange/CanChange';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useListFilters } from '@/ui/useListFilters';
import { usePageTitle } from '@/ui/usePageTitle';
import { SettingDeleteDialog } from '../SettingDeleteDialog';
import { useSettingStatus } from '../useSettingStatus';
import {
  FINANCE_LISTS,
  setFinanceBudgetItemStatus,
  useDeleteFinanceBudgetItem,
  useFinanceBudgetPage,
} from './api';
import type { FinanceBudget, FinanceBudgetItem } from './api';
import { BudgetCards } from './BudgetCards';
import type { FinanceItemActions } from './finance-item-actions';
import { FinanceBudgetItemDetails } from './FinanceBudgetItemDetails';
import { FinanceBudgetItemForm } from './FinanceBudgetItemForm';
import { RenameBudgetDialog } from './RenameBudgetDialog';
import { budgetYearOf } from './schemas';

/** The side-panel form that is open: a new item, or one being changed. */
type OpenForm = { kind: 'new' } | { kind: 'edit'; item: FinanceBudgetItem };

/** The items line items link to: a simple list, one card per finance budget, until the Finance module. */
export function FinanceBudgetItemsPage() {
  usePageTitle('Finance budget items');
  const filters = useListFilters();
  const [params, setParams] = useAddressParams();
  const requestedYear = budgetYearOf(params);
  const budgets = useFinanceBudgetPage(requestedYear);
  const deleteItem = useDeleteFinanceBudgetItem();
  const [form, setForm] = useState<OpenForm | null>(null);
  const [renaming, setRenaming] = useState<FinanceBudget | null>(null);
  const [deleting, setDeleting] = useState<FinanceBudgetItem | null>(null);
  const status = useSettingStatus({
    kind: 'financeBudgetItem',
    request: setFinanceBudgetItemStatus,
    invalidate: FINANCE_LISTS,
  });

  const actions: FinanceItemActions = {
    view: (item) => filters.setOpenId(item.id),
    edit: (item) => setForm({ kind: 'edit', item }),
    setActive: (item, active) => (active ? status.reactivate(item) : status.setInactive(item)),
    remove: (item) => setDeleting(item),
  };
  const newItem = () => setForm({ kind: 'new' });
  const data = budgets.data;
  // The year chosen, also while its budgets are still on their way.
  const year = requestedYear ?? data?.year;

  function chooseYear(next: string) {
    setParams(
      (previous) => {
        const changed = new URLSearchParams(previous);
        changed.set('year', next);
        changed.delete('id');
        return changed;
      },
      { replace: true },
    );
  }

  // The details wait for the list; an item that is not in it any more says so.
  const openItem =
    filters.openId && data
      ? (data.items.flatMap((budget) => budget.items).find((item) => item.id === filters.openId) ??
        null)
      : undefined;
  const openBudget = openItem
    ? data?.items.find((budget) => budget.id === openItem.budgetId)
    : undefined;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Settings', to: '/settings' }, { label: 'Finance budget items' }]}
        title="Finance budget items"
        description="The finance budget items line items link to."
        actions={
          <CanChange>
            <Button variant="primary" icon={<Plus />} onClick={newItem}>
              New finance budget item
            </Button>
          </CanChange>
        }
      />
      <SettingsViewOnlyNote />
      {!data ? (
        <Card>
          {budgets.isError ? (
            <ErrorState error={budgets.error} onRetry={() => void budgets.refetch()} />
          ) : (
            <Skeleton lines={5} height="18px" />
          )}
        </Card>
      ) : (
        <BudgetCards
          data={data}
          year={year ?? data.year}
          loading={budgets.isPlaceholderData}
          filters={filters}
          actions={actions}
          onYear={chooseYear}
          onNew={newItem}
          onRename={setRenaming}
        />
      )}

      {form && data && (
        <FinanceBudgetItemForm
          item={form.kind === 'edit' ? form.item : undefined}
          year={year ?? data.year}
          years={data.years}
          onClose={() => setForm(null)}
        />
      )}
      {!form && openItem !== undefined && (
        <FinanceBudgetItemDetails
          item={openItem}
          budget={openBudget}
          actions={actions}
          onClose={() => filters.setOpenId('')}
        />
      )}
      {renaming && <RenameBudgetDialog budget={renaming} onClose={() => setRenaming(null)} />}
      {deleting && (
        <SettingDeleteDialog
          kind="financeBudgetItem"
          name={deleting.name}
          usage={deleting.usage}
          active={deleting.active}
          remove={() => deleteItem.mutateAsync(deleting.id)}
          setInactive={() => status.applyInactive(deleting)}
          invalidate={FINANCE_LISTS}
          onDeleted={() => {
            if (filters.openId === deleting.id) {
              filters.setOpenId('');
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
      {status.dialog}
    </>
  );
}
