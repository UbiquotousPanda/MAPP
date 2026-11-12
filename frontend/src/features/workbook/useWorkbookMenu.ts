import { useNavigate } from 'react-router';
import { asApiError } from '@/api/errors';
import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import { useToast } from '@/ui/Toast/useToast';
import { downloadExport } from './api';

/** The plan page's ⋯ items of the plan workbook: Import from Excel and Export to Excel. */
export function useWorkbookMenu(
  planId: string,
  canEditActivities: boolean,
  canExport: boolean,
): ActionsMenuItem[] {
  const navigate = useNavigate();
  const { show } = useToast();
  const items: ActionsMenuItem[] = [];
  if (canEditActivities) {
    items.push({
      label: 'Import from Excel',
      onSelect: () => void navigate(`/plans/${encodeURIComponent(planId)}/import`),
    });
  }
  if (canExport) {
    items.push({
      label: 'Export to Excel',
      onSelect: () =>
        void downloadExport(planId).catch((error: unknown) =>
          show({ message: asApiError(error).message }),
        ),
    });
  }
  return items;
}
