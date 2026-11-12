import { Pager } from '@/ui/Pager/Pager';
import type { RequestsGridData } from './api';
import { PAGE_SIZES } from './schemas';
import type { RequestsParams } from './schemas';
import styles from './PurchaseRequests.module.css';

export interface GridPagerProps {
  grid: RequestsGridData;
  onParams: (changes: Partial<RequestsParams>) => void;
}

export function GridPager({ grid, onParams }: GridPagerProps) {
  return (
    <Pager
      className={styles.pager}
      page={grid.page}
      pageSize={grid.pageSize}
      total={grid.total}
      sizes={PAGE_SIZES}
      onPage={(page) => onParams({ page })}
      onPageSize={(pageSize) => onParams({ pageSize })}
    />
  );
}
