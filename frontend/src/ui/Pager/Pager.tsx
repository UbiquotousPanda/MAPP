import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { formatWhole } from '@/format/decimal';
import { Button } from '../Button/Button';
import { Select } from '../Select/Select';
import { cx } from '../cx';
import styles from './Pager.module.css';

export interface PagerProps<Size extends number> {
  page: number;
  pageSize: number;
  total: number;
  /** Without sizes the page size is fixed and Rows per page is left out. */
  sizes?: readonly Size[];
  onPage: (page: number) => void;
  onPageSize?: (pageSize: Size) => void;
  /** Under a table (with a gap above) or as its card's footer (a hairline above); none inside a gap. */
  placement: 'below' | 'cardFooter';
}

/** "1–50 of 120" on the left; Rows per page and, with more than one page, Previous and Next on the right. */
export function Pager<Size extends number>(props: PagerProps<Size>) {
  const { page, pageSize, total, sizes, onPage, onPageSize, placement } = props;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // An old link, Back, or deletes can leave the page past the end: go to the last page instead.
  useEffect(() => {
    if (total > 0 && page > pages) onPage(pages);
  }, [total, page, pages, onPage]);
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav className={cx(styles.pager, styles[placement])} aria-label="Pages">
      <p className={styles.range} aria-live="polite">
        {total === 0
          ? 'No rows'
          : `${formatWhole(first)}–${formatWhole(last)} of ${formatWhole(total)}`}
      </p>
      <div className={styles.controls}>
        {sizes && onPageSize && (
          <Select
            label="Rows per page"
            value={String(pageSize)}
            options={sizes.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => {
              const size = sizes.find((one) => String(one) === value);
              if (size !== undefined) onPageSize(size);
            }}
          />
        )}
        {pages > 1 && (
          <div className={styles.buttons}>
            <Button
              size="sm"
              icon={<ChevronLeft />}
              aria-label="Previous page"
              className={styles.step}
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
            />
            <Button
              size="sm"
              icon={<ChevronRight />}
              aria-label="Next page"
              className={styles.step}
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
            />
          </div>
        )}
      </div>
    </nav>
  );
}
