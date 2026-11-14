import { cx } from '../cx';
import type { StatusTone } from '../StatusChip/StatusChip';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './StatusDot.module.css';

export interface StatusDotProps {
  tone: StatusTone;
  label: string;
}

/** For rows a chip would crowd: several statuses stack in one 24 px target; their labels are its tooltip and name. */
export function StatusDots({ dots }: { dots: StatusDotProps[] }) {
  return (
    <Tooltip
      content={dots.map((dot) => (
        <span key={dot.label} className={styles.line}>
          {dot.label}
        </span>
      ))}
    >
      <button type="button" className={styles.target}>
        <span className={styles.stack} aria-hidden="true">
          {dots.map((dot) => (
            <span key={dot.label} className={cx(styles.dot, styles[dot.tone])} />
          ))}
        </span>
        <span className="visually-hidden">{dots.map((dot) => dot.label).join('; ')}</span>
      </button>
    </Tooltip>
  );
}

export function StatusDot(dot: StatusDotProps) {
  return <StatusDots dots={[dot]} />;
}
