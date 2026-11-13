import { CircleCheck } from 'lucide-react';
import { useId } from 'react';
import type { Ref } from 'react';
import { Link } from 'react-router';
import { fieldHref } from '@/ui/record-links';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import type { Activity, ActivitySubmitProblem } from './api';
import { activityEditHref, thingsText } from './activity-text';
import styles from './ReadyToSubmitPanel.module.css';

export interface ReadyToSubmitPanelProps {
  activity: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Focused when Submit for approval finds problems. */
  ref?: Ref<HTMLElement>;
}

export function ReadyToSubmitPanel({ activity, open, onOpenChange, ref }: ReadyToSubmitPanelProps) {
  const headingId = useId();
  const { readiness } = activity;
  const planId = activity.plan.id;

  const advice = readiness.advice.length > 0 && (
    <Group title="Good to know" problems={readiness.advice} planId={planId} id={activity.id} />
  );

  if (readiness.problemCount === 0) {
    return (
      <section
        id="ready"
        ref={ref}
        tabIndex={-1}
        aria-labelledby={headingId}
        className={styles.panel}
      >
        <div className={styles.ready}>
          <CircleCheck aria-hidden="true" />
          <SectionHeading level={2} rank="card" id={headingId}>
            Ready to submit
          </SectionHeading>
        </div>
        {advice}
      </section>
    );
  }

  return (
    <section
      id="ready"
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={styles.panel}
    >
      <details open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
        <summary className={styles.summary}>
          <SectionHeading level={2} rank="card" id={headingId}>
            Ready to submit
          </SectionHeading>
          <span className={styles.count}>
            Submitting needs {thingsText(readiness.problemCount)}
          </span>
        </summary>
        <div className={styles.groups}>
          {readiness.activity.length > 0 && (
            <Group
              title="This activity"
              problems={readiness.activity}
              planId={planId}
              id={activity.id}
            />
          )}
          {readiness.lineItems.length > 0 && (
            <Group
              title="Line items"
              problems={readiness.lineItems}
              planId={planId}
              id={activity.id}
            />
          )}
          {advice}
        </div>
      </details>
    </section>
  );
}

interface GroupProps {
  title: string;
  problems: ActivitySubmitProblem[];
  planId: string;
  /** The activity's ID. */
  id: string;
}

function Group({ title, problems, planId, id }: GroupProps) {
  return (
    <div className={styles.group}>
      <SectionHeading level={3} rank="label">
        {title}
      </SectionHeading>
      <ul className={styles.list}>
        {problems.map((problem, index) => (
          <li key={`${problem.code}-${problem.field}-${index}`}>
            <ProblemLink problem={problem} planId={planId} id={id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A problem as a link to where it is fixed: a field of the activity's edit form, a field of a line
 * item's edit form, or the Line items section of this page.
 */
function ProblemLink({
  problem,
  planId,
  id,
}: {
  problem: ActivitySubmitProblem;
  planId: string;
  id: string;
}) {
  // A line item's message names the line item already: "Line item '<name>' (<id>): <problem>".
  if (problem.lineItemId) {
    return (
      <Link to={fieldHref('lineItem', problem.lineItemId, problem.field)}>{problem.message}</Link>
    );
  }
  if (problem.field === 'lineItems') {
    return <a href="#line-items">{problem.message}</a>;
  }
  return <Link to={activityEditHref(planId, id, problem.field)}>{problem.message}</Link>;
}
