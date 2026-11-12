import { Copy } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../Button/Button';
import { useToast } from '../Toast/useToast';
import styles from './HxKey.module.css';

const COPIED = 'HX key copied';
const COPY_FAILED = "Couldn't copy the HX key — select it and copy it yourself.";

export interface HxKeyProps {
  value: string;
  /** Where the key comes from, under it; left out in a table cell whose header carries it. */
  hint?: string;
  /** The Copy button's visible word; left out, the button is an icon. */
  copyText?: string;
}

/** A line's HX key, read-only with Copy (030 FR-016, 032 FR-020): requisitioners type it into GSAP. */
export function HxKey({ value, hint, copyText }: HxKeyProps) {
  const toast = useToast();
  const hintId = useId();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.show({ message: COPIED });
    } catch {
      toast.show({ message: COPY_FAILED });
    }
  }

  return (
    <span className={styles.hx}>
      <span className={styles.row}>
        <span className={styles.value} aria-describedby={hint ? hintId : undefined}>
          {value}
        </span>
        <Button
          size="sm"
          variant="tertiary"
          icon={<Copy />}
          aria-label={`Copy HX key ${value}`}
          onClick={() => void handleCopy()}
        >
          {copyText}
        </Button>
      </span>
      {hint && (
        <span id={hintId} className={styles.note}>
          {hint}
        </span>
      )}
    </span>
  );
}
