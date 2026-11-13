import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../cx';
import { InfoTip } from '../InfoTip/InfoTip';
import type { StatusTone } from '../StatusChip/StatusChip';
import { TooltipText } from '../Tooltip/TooltipText';
import { useFitText } from './useFitText';
import styles from './SummaryCard.module.css';

export interface SummaryCardProps {
  label: string;
  value: string | number;
  /** Text for an info tip, or a ready-made tip such as a field's help. */
  tip?: ReactNode;
  tone?: StatusTone;
  /** The complete value when `value` is shortened, in a tooltip. */
  fullValue?: string;
  detail?: ReactNode;
  to?: string;
  linkLabel?: string;
}

export function SummaryCard(props: SummaryCardProps) {
  const { label, value, tip, tone, fullValue, detail, to, linkLabel } = props;
  const isShortened = fullValue !== undefined && fullValue !== String(value);
  const shown = isShortened ? `${value} (${fullValue})` : String(value);
  const valueRef = useFitText<HTMLParagraphElement>(String(value));

  return (
    <div
      className={cx(styles.card, to && styles.linked)}
      data-long={String(value).length > 10 || undefined}
    >
      {to && (
        <Link to={to} aria-label={`${label}: ${shown} — ${linkLabel}`} className={styles.link} />
      )}
      <p className={styles.label}>
        {label}
        {typeof tip === 'string' ? <InfoTip label={label} text={tip} /> : tip}
      </p>
      <p ref={valueRef} className={cx(styles.value, tone && styles[tone])}>
        {isShortened ? (
          // The name starts with the visible text (WCAG 2.5.3).
          <TooltipText tip={fullValue}>
            {value} <span className="visually-hidden">({fullValue})</span>
          </TooltipText>
        ) : (
          value
        )}
      </p>
      {detail && <div className={styles.detail}>{detail}</div>}
      {to && <ChevronRight aria-hidden="true" className={styles.chevron} />}
    </div>
  );
}
