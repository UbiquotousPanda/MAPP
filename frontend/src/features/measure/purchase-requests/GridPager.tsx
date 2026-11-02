import { useId } from 'react';
import { Button } from '@/ui/Button/Button';
import type { RequestsGridData } from './api';
import { PAGE_SIZES } from './schemas';
import type { RequestsParams } from './schemas';
import styles from './PurchaseRequests.module.css';

export interface GridPagerProps {
  grid: RequestsGridData;
  onParams: (changes: Partial<RequestsParams>) => void;
}

export function GridPager({ grid, onParams }: GridPagerProps) {
  const sizeId = useId();
  const from = grid.total === 0 ? 0 : (grid.page - 1) * grid.pageSize + 1;
  const to = Math.min(grid.page * grid.pageSize, grid.total);
  return (
    <nav className={styles.pager} aria-label="Pages">
      <p className={styles.range}>
        {grid.total === 0 ? '0 vendors' : `Vendors ${from}–${to} of ${grid.total}`}
      </p>
      <div className={styles.buttons}>
        <Button
          size="sm"
          disabled={grid.page <= 1}
          onClick={() => onParams({ page: grid.page - 1 })}
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={to >= grid.total}
          onClick={() => onParams({ page: grid.page + 1 })}
        >
          Next
        </Button>
      </div>
      <label htmlFor={sizeId} className={styles.field}>
        Vendors per page
        <select
          id={sizeId}
          className={styles.select}
          value={grid.pageSize}
          onChange={(event) => {
            const size = PAGE_SIZES.find((one) => one === Number(event.target.value));
            if (size !== undefined) {
              onParams({ pageSize: size });
            }
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
