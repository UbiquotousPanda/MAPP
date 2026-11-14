import { refusalText } from '@/session/refusal-text';
import { useAccess } from '@/session/access';
import { ExportMenu as Export } from '@/ui/ExportMenu/ExportMenu';
import type { ExportMenuProps } from '@/ui/ExportMenu/ExportMenu';
import type { ExportFormat } from './api';

/** A report's Export: sm by default, refused with its reason without "Export data". */
export function ExportMenu({
  size = 'sm',
  ...props
}: Omit<ExportMenuProps<ExportFormat>, 'refusal'>) {
  const access = useAccess();
  const refusal = access.has('data.export') ? undefined : refusalText('Exporting', access);
  return <Export size={size} refusal={refusal} {...props} />;
}
