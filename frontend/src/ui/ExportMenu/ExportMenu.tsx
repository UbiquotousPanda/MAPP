import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/errors';
import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import { useToast } from '../Toast/useToast';
import styles from './ExportMenu.module.css';

export type ExportFormat = 'xlsx' | 'csv' | 'pptx' | 'pdf';

const FORMAT_WORDS: Record<ExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
  pptx: 'PowerPoint (.pptx)',
  pdf: 'PDF (.pdf)',
};

const PREPARING = 'Preparing your file…';

export interface ExportMenuProps<F extends ExportFormat> {
  formats: F[];
  download: (format: F) => Promise<string>;
  label?: string;
  size?: 'sm' | 'md';
  iconOnly?: boolean;
  refusal?: string;
  emptyText?: string;
}

/** **Export** (design system §5.1): one format downloads at once, several open a menu. */
export function ExportMenu<F extends ExportFormat>(props: ExportMenuProps<F>) {
  const { formats, label = 'Export', size = 'md', iconOnly = false, refusal } = props;
  const { show } = useToast();
  const [preparing, setPreparing] = useState(false);

  async function exportAs(format: F) {
    if (props.emptyText) {
      show({ message: props.emptyText });
      return;
    }
    setPreparing(true);
    try {
      show({ message: `Exported '${await props.download(format)}'` });
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError('other');
      if (failure.kind !== 'signInRequired' && failure.kind !== 'sessionExpired') {
        show({ message: failure.message });
      }
    } finally {
      setPreparing(false);
    }
  }

  const words = preparing ? PREPARING : label;
  const trigger = (onClick?: () => void) => (
    <Button
      size={size}
      icon={preparing ? <LoaderCircle className={styles.spinner} /> : <Download />}
      aria-busy={preparing || undefined}
      aria-label={iconOnly ? words : undefined}
      title={refusal ?? (iconOnly ? label : undefined)}
      aria-description={refusal}
      disabled={refusal !== undefined}
      onClick={onClick}
    >
      {iconOnly ? null : words}
    </Button>
  );

  // One format: the button downloads it; a menu of one choice is a click for nothing.
  const only = formats.length === 1 ? formats[0] : undefined;
  if (only || refusal) {
    return trigger(only && (() => void exportAs(only)));
  }
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger()}</Menu.Trigger>
      <Menu.Content>
        {formats.map((format) => (
          <Menu.Item key={format} disabled={preparing} onChoose={() => void exportAs(format)}>
            {FORMAT_WORDS[format]}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
