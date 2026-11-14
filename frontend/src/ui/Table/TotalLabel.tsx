import styles from './Table.module.css';

export interface TotalLabelProps {
  /** A second line under "Total": "12 activities". */
  count?: string;
}

export function TotalLabel({ count }: TotalLabelProps) {
  return (
    <>
      <span>Total</span>
      {count && (
        <>
          {' '}
          <span className={styles.totalCount}>{count}</span>
        </>
      )}
    </>
  );
}
