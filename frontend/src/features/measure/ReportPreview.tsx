import type { ReactNode } from 'react';
import type { ReportKey } from './reports';
import styles from './ReportsPage.module.css';

/** Abstract drawings, not data: each hints at the chart its report opens with. */
const DRAWINGS: Partial<Record<ReportKey, ReactNode>> = {
  performance: (
    <>
      <path d="M40 78a40 40 0 0 1 80 0" className={styles.track} />
      <path d="M40 78a40 40 0 0 1 64-32" className={styles.stroke} />
      <circle cx="104" cy="46" r="5" className={styles.fill} />
      <rect x="150" y="34" width="56" height="8" rx="4" className={styles.soft} />
      <rect x="150" y="50" width="40" height="8" rx="4" className={styles.soft} />
      <rect x="150" y="66" width="48" height="8" rx="4" className={styles.fillFaint} />
    </>
  ),
  budget: (
    <>
      {[20, 52, 84, 116, 148, 180].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={[46, 30, 54, 22, 40, 34][i]}
          width="16"
          height={92 - ([46, 30, 54, 22, 40, 34][i] ?? 0)}
          rx="3"
          className={i % 2 === 0 ? styles.fill : styles.fillMid}
        />
      ))}
      <path d="M12 26 L208 26" className={styles.dashed} />
    </>
  ),
  purchasing: (
    <>
      {[18, 40, 62].map((y, i) => (
        <g key={y}>
          <rect x="20" y={y} width={[110, 150, 80][i]} height="14" rx="4" className={styles.fill} />
          <rect
            x={20 + ([110, 150, 80][i] ?? 0) + 4}
            y={y}
            width={[50, 30, 70][i]}
            height="14"
            rx="4"
            className={styles.fillFaint}
          />
        </g>
      ))}
    </>
  ),
  approvals: (
    <>
      <path d="M34 50 L186 50" className={styles.track} />
      {[34, 84, 134, 186].map((x, i) => (
        <circle key={x} cx={x} cy="50" r="11" className={i < 3 ? styles.fill : styles.soft} />
      ))}
      {[34, 84, 134].map((x) => (
        <path key={x} d={`M${x - 5} 50 l4 4 l7 -8`} className={styles.tick} />
      ))}
    </>
  ),
  planData: (
    <>
      {[16, 36, 56, 76].map((y, i) => (
        <g key={y}>
          <rect x="20" y={y} width="44" height="8" rx="4" className={styles.soft} />
          <rect
            x="74"
            y={y}
            width={[120, 84, 56, 28][i]}
            height="8"
            rx="4"
            className={styles.fill}
          />
        </g>
      ))}
    </>
  ),
};

export function ReportPreview({ report }: { report: ReportKey }) {
  return (
    <svg className={styles.drawing} viewBox="0 0 220 100" aria-hidden="true" focusable="false">
      {DRAWINGS[report]}
    </svg>
  );
}
