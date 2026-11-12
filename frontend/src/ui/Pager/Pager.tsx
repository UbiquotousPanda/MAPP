import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWhole } from '@/format/decimal';
import { Button } from '../Button/Button';
import { Select } from '../Select/Select';
import { cx } from '../cx';
import styles from './Pager.module.css';

export interface PagerProps<Size extends number> {
  page: number;
  pageSize: number;
  total: number;
  sizes: readonly Size[];
  onPage: (page: number) => void;
  onPageSize: (pageSize: Size) => void;
  /** The spacing of the place it sits in (a card's footer, under a table). */
  className?: string;
}

/** "1–50 of 120" on the left; Rows per page and, with more than one page, Previous and Next on the right. */
export function Pager<Size extends number>(props: PagerProps<Size>) {
  const { page, pageSize, total, sizes, onPage, onPageSize, className } = props;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <nav className={cx(styles.pager, className)} aria-label="Pages">
      <p className={styles.range} aria-live="polite">
        {total === 0
          ? 'No rows'
          : `${formatWhole(first)}–${formatWhole(last)} of ${formatWhole(total)}`}
      </p>
      <div className={styles.controls}>
        <Select
          label="Rows per page"
          value={String(pageSize)}
          options={sizes.map((size) => ({ value: String(size), label: String(size) }))}
          onChange={(value) => {
            const size = sizes.find((one) => String(one) === value);
            if (size !== undefined) onPageSize(size);
          }}
        />
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
