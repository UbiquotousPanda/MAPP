import { useState } from 'react';
import { useFormatters } from '@/format/useFormatters';
import { isDate } from '../DatePicker/calendar';

const EXAMPLE = '2026-03-12';

export interface TypedDate {
  value: string;
  text: string;
  /** The problem of typed text that is not a date, once the field is left. */
  problem?: string;
  type: (text: string) => void;
  settle: () => void;
  choose: (date: string) => void;
}

/** A typed date counts as soon as it reads as one, and shows in the person's format once left. */
export function useTypedDate(value: string, onChange: (value: string) => void): TypedDate {
  const { date, parseDate } = useFormatters();
  const [draft, setDraft] = useState<{ text: string; over: string; wrong: boolean } | null>(null);
  const own = draft && draft.over === value ? draft : null;
  const read = (text: string) => (text.trim() === '' ? '' : parseDate(text));
  return {
    value,
    text: own ? own.text : isDate(value) ? date(value) : value,
    problem: own?.wrong ? `Enter a date like ${date(EXAMPLE)}.` : undefined,
    type: (text) => {
      const day = read(text);
      setDraft({ text, over: day ?? value, wrong: false });
      if (day !== null && day !== value) {
        onChange(day);
      }
    },
    settle: () => {
      if (own && read(own.text) === null) {
        setDraft({ ...own, over: '', wrong: true });
        onChange('');
      } else {
        setDraft(null);
      }
    },
    choose: (day) => {
      setDraft(null);
      onChange(day);
    },
  };
}
