import type { ComponentProps } from 'react';
import styles from './SectionHeading.module.css';

export type HeadingRank = 'section' | 'panel' | 'card' | 'sub' | 'label';

export interface SectionHeadingProps extends Omit<ComponentProps<'h2'>, 'className' | 'style'> {
  level: 2 | 3 | 4;
  /** The look follows the role, the level the outline (design system §3.2). */
  rank: HeadingRank;
  divided?: boolean;
}

const TAGS = { 2: 'h2', 3: 'h3', 4: 'h4' } satisfies Record<2 | 3 | 4, 'h2' | 'h3' | 'h4'>;

export function SectionHeading({ level, rank, divided, ...heading }: SectionHeadingProps) {
  const Tag = TAGS[level];
  return (
    <Tag className={divided ? `${styles[rank]} ${styles.divided}` : styles[rank]} {...heading} />
  );
}
