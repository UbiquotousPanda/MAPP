import { Pager as SharedPager } from '@/ui/Pager/Pager';
import type { PagerProps as SharedProps } from '@/ui/Pager/Pager';
import { PAGE_SIZES } from './financials-links';
import type { PageSize } from './financials-links';

export type PagerProps = Omit<SharedProps<PageSize>, 'sizes'>;

export function Pager(props: PagerProps) {
  return <SharedPager {...props} sizes={PAGE_SIZES} />;
}
