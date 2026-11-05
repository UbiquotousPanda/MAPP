import { asOfText } from '@/format/asOf';
import { useRatesAsOf } from './api';
import styles from './RatesAsOfNote.module.css';

/** The footer note under converted amounts: "GSAP rates as of 10:45". Nothing until the rates load. */
export function RatesAsOfNote() {
  const asOf = useRatesAsOf().data;
  return asOf ? <p className={styles.note}>{asOfText(asOf)}</p> : null;
}
