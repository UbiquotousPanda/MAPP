import { Pager } from '@/ui/Pager/Pager';
import type { ApprovalsGridData } from './api';
import type { ApprovalsParams, PageSize } from './schemas';
import styles from './ApprovalsGrid.module.css';

export interface GridPagerProps {
  grid: ApprovalsGridData;
  sizes: readonly PageSize[];
  onParams: (changes: Partial<ApprovalsParams>) => void;
}

export function GridPager({ grid, sizes, onParams }: GridPagerProps) {
  return (
    <Pager
      className={styles.pager}
      page={grid.page}
      pageSize={grid.pageSize}
      total={grid.total}
      sizes={sizes}
      onPage={(page) => onParams({ page })}
      onPageSize={(pageSize) => onParams({ pageSize })}
    />
  );
}
