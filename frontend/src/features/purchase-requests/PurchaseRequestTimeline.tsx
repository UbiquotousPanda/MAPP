import { useFormatters } from '@/format/useFormatters';
import { Card } from '@/ui/Card/Card';
import type { PurchaseRequest, PurchaseRequestTimelineStep } from './api';
import { stepFact, TIMELINE_SUBTITLE, TIMELINE_TITLE } from './timeline-text';
import styles from './PurchaseRequestTimeline.module.css';

/** The purchase request's steps from Created to Paid, each with its date and who, then what it waits for. */
export function PurchaseRequestTimeline({ purchaseRequest }: { purchaseRequest: PurchaseRequest }) {
  const { dateTime } = useFormatters();
  return (
    <Card title={TIMELINE_TITLE} subtitle={TIMELINE_SUBTITLE}>
      <ol className={styles.steps} aria-label={TIMELINE_TITLE}>
        {purchaseRequest.timeline.map((step) => (
          <Step key={step.key} step={step} when={step.at ? dateTime(step.at) : null} />
        ))}
      </ol>
    </Card>
  );
}

function Step({ step, when }: { step: PurchaseRequestTimelineStep; when: string | null }) {
  const className = [
    styles.step,
    step.reached ? styles.reached : '',
    step.waiting ? styles.next : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <li className={className} aria-current={step.waiting ? 'step' : undefined}>
      <span className={styles.mark} aria-hidden="true" />
      <span className={styles.text}>
        <span className={styles.label}>{step.label}</span>
        {step.reached && <span className={styles.fact}>{stepFact(step, when)}</span>}
        {step.waiting && <span className={styles.waiting}>{step.waiting}</span>}
      </span>
    </li>
  );
}
