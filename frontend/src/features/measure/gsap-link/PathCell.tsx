import styles from './GsapLink.module.css';

/** Plan › Activity on one line; the whole path shows on hover. */
export function PathCell({ text }: { text: string }) {
  return (
    <span className={styles.path} title={text}>
      {text}
    </span>
  );
}
