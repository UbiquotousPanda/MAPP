import { useLayoutEffect, useRef, useState } from 'react';
import styles from './RequiredLegend.module.css';

/** "* Required" and "◆ Needed to publish", once per form by its first legend; screen readers skip it. */
export function RequiredLegend() {
  const legend = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);
  const [later, setLater] = useState<string[]>([]);

  useLayoutEffect(() => {
    const scope =
      legend.current?.closest('form') ??
      legend.current?.closest('[role="dialog"], [role="alertdialog"]');
    if (!scope) {
      return;
    }
    const check = () => {
      const first = scope.querySelector('[data-required-legend]') === legend.current;
      const markings = [...scope.querySelectorAll('[data-marking]')].map((m) =>
        m.getAttribute('data-marking'),
      );
      setLater(first ? [...new Set(markings.filter((m): m is string => Boolean(m)))] : []);
      setShown(first && scope.querySelector('[aria-required="true"]') !== null);
    };
    check();
    // Fields come and go with the form's choices; the legend follows them.
    const observer = new MutationObserver(check);
    observer.observe(scope, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-required', 'data-marking'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <p
      ref={legend}
      data-required-legend=""
      hidden={!shown && later.length === 0}
      aria-hidden="true"
      className={styles.legend}
    >
      {shown && (
        <span className={styles.item}>
          <span className={styles.asterisk}>*</span> Required
        </span>
      )}
      {later.map((marking) => (
        <span key={marking} className={styles.item}>
          <span className={styles.diamond}>◆</span> {marking}
        </span>
      ))}
    </p>
  );
}
