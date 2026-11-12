import { Search, X } from 'lucide-react';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { cx } from '../cx';
import { Tooltip } from '../Tooltip/Tooltip';
import styles from './SearchField.module.css';

export interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Says what it searches, on screen: "Search name or ID" (design system §6.1). */
  placeholder?: string;
  size?: 'sm' | 'md';
  /** Reports the text this many milliseconds after the last key, or at once when the box loses focus. */
  delay?: number;
}

/** A list's search box (design system §5.2): it only reports the text; the list filters. */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  size,
  delay,
}: SearchFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ text: string; over: string } | null>(null);
  // A draft typed over an older value gives way when the value changes elsewhere (Clear filters, Back).
  const text = draft && draft.over === value ? draft.text : value;
  const pending = draft !== null && draft.over === value && draft.text !== value;
  const apply = useEffectEvent((next: string) => onChange(next));

  useEffect(() => {
    if (!pending || delay === undefined) {
      return;
    }
    const timer = setTimeout(() => apply(text), delay);
    return () => clearTimeout(timer);
  }, [pending, text, delay]);

  function type(next: string) {
    if (delay === undefined) {
      onChange(next);
    } else {
      setDraft({ text: next, over: value });
    }
  }

  function settle() {
    if (pending) {
      // Waits for this text to come back as the value; a page left meanwhile never gets it.
      setDraft({ text, over: text });
      onChange(text);
    }
  }

  function clear() {
    setDraft(null);
    onChange('');
    input.current?.focus();
  }

  return (
    <div className={cx(styles.search, size === 'sm' && styles.small)}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search className={styles.icon} aria-hidden="true" />
      <input
        ref={input}
        id={id}
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => type(event.target.value)}
        onBlur={settle}
        className={styles.input}
      />
      {text && (
        <Tooltip content="Clear search">
          <button type="button" className={styles.clear} aria-label="Clear search" onClick={clear}>
            <X />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
