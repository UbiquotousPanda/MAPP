import { CircleAlert, CircleCheckBig } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { LevelTag } from '@/ui/LevelTag/LevelTag';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { recordHref } from '@/ui/record-links';
import { useFormatters } from '@/format/useFormatters';
import styles from './AttentionCard.module.css';
import { useHomeAttention } from './api';
import type { HomeAttentionItem } from './api';
import type { ReasonFormatters } from './attention-text';
import {
  NOTHING_NEEDS_ATTENTION,
  reasonLinkName,
  reasonLinkOf,
  reasonText,
} from './attention-text';
import { SHOW_FEWER, viewAllText } from './home-text';
import { SectionError } from './SectionError';

/** As in Waiting for my approval beside it, so the two cards stay even. */
const SHOWN = 5;

/** Each record once with all its reasons, in the API's order; there is no page of them, so View all opens the rest here. */
export function AttentionCard() {
  const attention = useHomeAttention();
  const { money, date } = useFormatters();
  const [showAll, setShowAll] = useState(false);

  return (
    <Card title="Needs your attention">
      {attention.isPending ? (
        <Skeleton lines={4} height="18px" />
      ) : attention.isError ? (
        <SectionError onRetry={() => void attention.refetch()} />
      ) : attention.data.items.length === 0 ? (
        <EmptyState compact icon={<CircleCheckBig />} title={NOTHING_NEEDS_ATTENTION} />
      ) : (
        <>
          <ul className={styles.items}>
            {(showAll ? attention.data.items : attention.data.items.slice(0, SHOWN)).map((item) => (
              <AttentionRow
                key={`${item.recordType}-${item.id}`}
                item={item}
                format={{ money, date }}
              />
            ))}
          </ul>
          {attention.data.items.length > SHOWN && (
            <Button
              variant="tertiary"
              size="sm"
              className={styles.more}
              aria-expanded={showAll}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? SHOW_FEWER : viewAllText(attention.data.total)}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function AttentionRow({ item, format }: { item: HomeAttentionItem; format: ReasonFormatters }) {
  const href = recordHref(item.recordType, item.id, item.plan.id);
  return (
    <li className={styles.item}>
      <div className={styles.head}>
        <LevelTag level={item.recordType} />
        <Link to={href} className={styles.name}>
          {item.name}
        </Link>
        <span className={styles.id}>{item.id}</span>
      </div>
      {item.recordType !== 'plan' && <p className={styles.where}>in {item.plan.name}</p>}
      <ul className={styles.reasons}>
        {item.reasons.map((reason) => {
          const link = reasonLinkOf(reason, item.recordType);
          return (
            <li key={reason.kind} className={styles.reason}>
              <CircleAlert aria-hidden="true" className={styles.icon} />
              <span>
                {reasonText(reason, format, item.recordType)}{' '}
                <Link
                  to={`${href}${link.hash}`}
                  aria-label={reasonLinkName(link.label, item.recordTypeLabel, item.name)}
                  className={styles.fix}
                >
                  {link.label}
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
