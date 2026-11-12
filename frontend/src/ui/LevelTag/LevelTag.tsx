import { cx } from '../cx';
import styles from './LevelTag.module.css';

export type PlanningLevel = 'plan' | 'campaign' | 'initiative' | 'activity' | 'lineItem';
type PurchaseLevel = 'purchaseRequest' | 'purchaseRequestLine';

const WORDS: Record<PlanningLevel | PurchaseLevel, string> = {
  plan: 'PLAN',
  campaign: 'CAMPAIGN',
  initiative: 'INITIATIVE',
  activity: 'ACTIVITY',
  lineItem: 'LINE ITEM',
  purchaseRequest: 'PURCHASE REQUEST',
  purchaseRequestLine: 'PR LINE',
};

export interface LevelTagProps {
  level: PlanningLevel | PurchaseLevel;
}

/** A record type with no level of its own ("currency"), in the levels' shape and a neutral colour. */
export interface OtherTagProps {
  other: string;
}

/** A record's level as a tag on a tint of its colour (design system §4.2); the word carries it. */
export function LevelTag(props: LevelTagProps | OtherTagProps) {
  if ('other' in props) {
    return <span className={cx(styles.tag, styles.other)}>{props.other.toUpperCase()}</span>;
  }
  return <span className={cx(styles.tag, styles[props.level])}>{WORDS[props.level]}</span>;
}
