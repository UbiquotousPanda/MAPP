import type { ReactNode } from 'react';
import type { ReportKey } from './reports';
import styles from './ReportsPage.module.css';

/** Abstract drawings, not data: each hints at the chart its report opens with. */
const DRAWINGS: Record<ReportKey, ReactNode> = {
  summary: (
    <>
      <path d="M40 78a40 40 0 0 1 80 0" className={styles.track} />
      <path d="M40 78a40 40 0 0 1 64-32" className={styles.stroke} />
      <circle cx="104" cy="46" r="5" className={styles.fill} />
      <rect x="150" y="34" width="56" height="8" rx="4" className={styles.soft} />
      <rect x="150" y="50" width="40" height="8" rx="4" className={styles.soft} />
      <rect x="150" y="66" width="48" height="8" rx="4" className={styles.fillFaint} />
    </>
  ),
  revenue: (
    <>
      <path d="M16 84 L60 66 L100 72 L144 40 L196 22 L196 92 L16 92 Z" className={styles.area} />
      <path d="M16 84 L60 66 L100 72 L144 40 L196 22" className={styles.stroke} />
      <path d="M16 70 L196 40" className={styles.dashed} />
      <circle cx="144" cy="40" r="4" className={styles.fill} />
    </>
  ),
  funnel: (
    <>
      <rect x="28" y="16" width="168" height="16" rx="4" className={styles.fill} />
      <rect x="52" y="40" width="120" height="16" rx="4" className={styles.fillMid} />
      <rect x="80" y="64" width="64" height="16" rx="4" className={styles.fillFaint} />
    </>
  ),
  planBudget: (
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
  purchaseRequests: (
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
  gsapLink: (
    <>
      <rect x="20" y="30" width="56" height="40" rx="8" className={styles.soft} />
      <rect x="144" y="30" width="56" height="40" rx="8" className={styles.fillFaint} />
      <path d="M84 42 L136 42" className={styles.stroke} />
      <path d="M128 36 L136 42 L128 48" className={styles.stroke} />
      <path d="M136 58 L84 58" className={styles.dashed} />
      <path d="M92 52 L84 58 L92 64" className={styles.strokeFaint} />
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
  planDetails: (
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
  userAccess: (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <circle
            cx={34 + i * 38}
            cy="38"
            r="12"
            className={i < 3 ? styles.fill : styles.fillFaint}
          />
          <rect x={22 + i * 38} y="58" width="24" height="8" rx="4" className={styles.soft} />
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
