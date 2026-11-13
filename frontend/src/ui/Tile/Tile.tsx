import { ArrowRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../cx';
import linkCard from '../LinkCard/LinkCard.module.css';
import styles from './Tile.module.css';

export type TileAccent = 1 | 2 | 3 | 4;

/** Equal tiles, three to a row on a wide screen. */
export function TileList({ children }: { children: ReactNode }) {
  return (
    <ul role="list" className={styles.list}>
      {children}
    </ul>
  );
}

export interface TileProps {
  title: string;
  /** A click anywhere on the tile opens it; without it the tile shows `status` in place of the arrow. */
  to?: string;
  accent: TileAccent;
  /** Shapes drawn in the 220 × 100 band at the top, classed with the `drawing` classes of Tile.module.css. */
  picture: ReactNode;
  headingLevel?: 2 | 3;
  /** Beside the title, above the tile's link: an ⓘ or an actions menu. */
  aside?: ReactNode;
  foot?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
}

export function Tile(props: TileProps) {
  const { title, to, accent, picture, aside, foot, status, children } = props;
  const Heading = props.headingLevel === 3 ? 'h3' : 'h2';
  return (
    <li className={cx(linkCard.card, to ? styles.tile : styles.tileOff, styles[`accent${accent}`])}>
      <div className={styles.preview}>
        <svg className={styles.drawing} viewBox="0 0 220 100" aria-hidden="true" focusable="false">
          {picture}
        </svg>
      </div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <Heading className={styles.nameHeading}>
            {to ? (
              <Link to={to} className={cx(styles.name, linkCard.link)}>
                {title}
              </Link>
            ) : (
              <span className={styles.name}>{title}</span>
            )}
          </Heading>
          {aside && <span className={styles.aside}>{aside}</span>}
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.foot}>
          <span className={styles.footText}>{foot}</span>
          {to ? (
            <span className={styles.go} aria-hidden="true">
              <ArrowRight />
            </span>
          ) : (
            status
          )}
        </div>
      </div>
    </li>
  );
}

export interface AddTileProps {
  to: string;
  title: string;
  text: string;
}

/** The dashed tile that starts a new one, where a list has none yet. */
export function AddTile({ to, title, text }: AddTileProps) {
  return (
    <li className={cx(linkCard.card, styles.add)}>
      <span className={styles.addIcon} aria-hidden="true">
        <Plus />
      </span>
      <Link to={to} className={cx(styles.name, linkCard.link)}>
        {title}
      </Link>
      <p className={styles.addText}>{text}</p>
    </li>
  );
}
