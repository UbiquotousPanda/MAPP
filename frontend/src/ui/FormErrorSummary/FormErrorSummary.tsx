import { useEffect, useRef } from 'react';
import { scrollBehavior } from '../motion';
import { RequiredLegend } from '../RequiredLegend/RequiredLegend';
import styles from './FormErrorSummary.module.css';

export interface FieldProblem {
  field: string;
  message: string;
}

export interface FormErrorSummaryProps<P extends FieldProblem> {
  errors: readonly P[];
  fieldId?: (field: string) => string;
  /** Takes the person to a problem the page shows itself, instead of focusing its field by id. */
  onGo?: (problem: P) => void;
  describe?: (problem: P) => string;
}

/** Lists every problem as a link to its field and takes the focus, so the problems are read out. */
export function FormErrorSummary<P extends FieldProblem>({
  errors,
  fieldId = (field) => field,
  onGo,
  describe = (problem) => problem.message,
}: FormErrorSummaryProps<P>) {
  const summary = useRef<HTMLDivElement>(null);

  // A new list means a new failed attempt: bring the person here again.
  useEffect(() => {
    summary.current?.focus();
  }, [errors]);

  if (errors.length === 0) {
    return <RequiredLegend />;
  }

  const title =
    errors.length === 1
      ? '1 problem needs your attention'
      : `${errors.length} problems need your attention`;

  function goTo(problem: P) {
    if (onGo) {
      onGo(problem);
    } else {
      const field = document.getElementById(fieldId(problem.field));
      field?.scrollIntoView?.({ behavior: scrollBehavior(), block: 'center' });
      field?.focus({ preventScroll: true });
    }
  }

  return (
    <>
      <div ref={summary} tabIndex={-1} className={styles.summary}>
        <div role="alert">
          <h2 className={styles.title}>{title}</h2>
          <ul className={styles.list}>
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`}>
                <a
                  href={`#${fieldId(error.field)}`}
                  onClick={(event) => {
                    // Move the focus ourselves: following the #link would change the page address.
                    event.preventDefault();
                    goTo(error);
                  }}
                >
                  {describe(error)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <RequiredLegend />
    </>
  );
}
