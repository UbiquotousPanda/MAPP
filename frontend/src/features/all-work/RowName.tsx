import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { DisclosureButton, DisclosureSpace } from '@/ui/DisclosureButton/DisclosureButton';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { cx } from '@/ui/cx';
import { LEVEL_LABELS } from '@/ui/AttributeFilterMenu/attribute-filter';
import { CONTEXT_LABEL, CONTEXT_TIP } from './all-work-text';
import type { AllWorkRow } from './all-work-types';
import { Highlight } from './Highlight';
import { rowHref } from './row-href';
import styles from './RowName.module.css';
import { statusWord } from './status-words';
import type { VisibleRow } from './view-rows';

const LONG_NAME = 36;

export interface RowNameProps {
  visible: VisibleRow;
  search: string;
  showStatus: boolean;
  onToggle: (key: string) => void;
  onOpen: (row: AllWorkRow) => void;
  children?: ReactNode;
}

export function RowName({ visible, search, showStatus, onToggle, onOpen, children }: RowNameProps) {
  const { row, expanded, childCount } = visible;

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onOpen(row);
  }

  const link = (
    <Link
      to={rowHref(row)}
      className={cx(styles.link, row.level === 'plan' && styles.planLink)}
      onClick={open}
    >
      <Highlight text={row.name} search={search} />
    </Link>
  );

  return (
    <div className={styles.name} style={{ paddingLeft: `${row.depth * 24}px` }}>
      {childCount > 0 ? (
        <DisclosureButton
          expanded={expanded}
          label={`${expanded ? 'Collapse' : 'Expand'} ${row.name}`}
          onClick={() => onToggle(row.key)}
        />
      ) : (
        <DisclosureSpace />
      )}
      <div className={styles.text}>
        <div className={styles.line}>
          {row.name.length > LONG_NAME ? <Tooltip content={row.name}>{link}</Tooltip> : link}
          {LEVEL_LABELS[row.level] && (
            <span className={styles.level}>{LEVEL_LABELS[row.level]}</span>
          )}
          {row.level === 'plan' && row.year !== undefined && (
            <span className={styles.year}>{row.year}</span>
          )}
          {row.strategic && <span className={styles.aop}>AOP</span>}
          {row.bcpir && <span className={styles.aop}>BCPIR</span>}
          {showStatus && row.status && (
            <StatusChip tone={row.status.tone}>{statusWord(row.status.label)}</StatusChip>
          )}
        </div>
        {row.role === 'context' && (
          <span className={styles.context}>
            {CONTEXT_LABEL}
            <InfoTip label={CONTEXT_LABEL} text={CONTEXT_TIP} />
          </span>
        )}
        {row.searchHit?.excerpt && (
          <span className={styles.excerpt}>
            <Highlight text={row.searchHit.excerpt} search={search} />
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
