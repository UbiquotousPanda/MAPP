import styles from './GsapLink.module.css';

/** Plan › Activity on one line; the whole path shows on hover. */
export function PathCell({ text }: { text: string }) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- truncated text whose full text is on the page (D-418)
    <span className={styles.path} title={text}>
      {text}
    </span>
  );
}
