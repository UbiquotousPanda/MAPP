import { Download, LoaderCircle } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useRef, useState } from 'react';
import { ApiError } from '@/api/errors';
import { refusalText } from '@/session/refusal-text';
import { useAccess } from '@/session/access';
import { Button } from '@/ui/Button/Button';
import { useToast } from '@/ui/Toast/useToast';
import type { ExportFormat } from './api';
import styles from './ReportFrame.module.css';

const FORMAT_WORDS: Record<ExportFormat, string> = { xlsx: 'Excel (.xlsx)', csv: 'CSV (.csv)' };

interface ExportMenuProps {
  label: string;
  formats: ExportFormat[];
  download: (format: ExportFormat) => Promise<string>;
  /** md in a page header beside Saved views; sm inside a widget. */
  size?: 'sm' | 'md';
  /** Only the download icon, named by label: in a widget's crowded header. */
  iconOnly?: boolean;
}

/** Export, or the reason it is unavailable: "Exporting isn't part of your role". */
export function ExportMenu(props: ExportMenuProps) {
  const { label, formats, download, size = 'sm', iconOnly = false } = props;
  const access = useAccess();
  const { show } = useToast();
  const [preparing, setPreparing] = useState(false);
  const chosen = useRef<ExportFormat | null>(null);

  if (!access.has('data.export')) {
    const reason = refusalText('Exporting', access);
    return (
      <Button
        variant="secondary"
        size={size}
        icon={<Download />}
        disabled
        title={reason}
        aria-label={iconOnly ? label : undefined}
        aria-description={reason}
      >
        {iconOnly ? null : label}
      </Button>
    );
  }

  async function exportAs(format: ExportFormat) {
    setPreparing(true);
    try {
      show({ message: `Exported '${await download(format)}'` });
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('other');
      if (failure.kind !== 'signInRequired' && failure.kind !== 'sessionExpired') {
        show({ message: failure.message });
      }
    } finally {
      setPreparing(false);
    }
  }

  const trigger = (onClick?: () => void) => (
    <Button
      variant="secondary"
      size={size}
      icon={preparing ? <LoaderCircle /> : <Download />}
      aria-busy={preparing || undefined}
      aria-label={iconOnly ? (preparing ? 'Preparing your file…' : label) : undefined}
      title={iconOnly ? label : undefined}
      onClick={onClick}
    >
      {iconOnly ? null : preparing ? 'Preparing your file…' : label}
    </Button>
  );

  // One format: the button downloads it; a menu of one choice is a click for nothing.
  const only = formats.length === 1 ? formats[0] : undefined;
  if (only) {
    return trigger(() => void exportAs(only));
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger()}</DropdownMenu.Trigger>{' '}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          align="end"
          sideOffset={4}
          onCloseAutoFocus={() => {
            const format = chosen.current;
            chosen.current = null;
            if (format) {
              void exportAs(format);
            }
          }}
        >
          {formats.map((format) => (
            <DropdownMenu.Item
              key={format}
              className={styles.item}
              disabled={preparing}
              onSelect={() => {
                chosen.current = format;
              }}
            >
              {FORMAT_WORDS[format]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
