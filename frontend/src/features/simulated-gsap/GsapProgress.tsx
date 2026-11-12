import { ProgressBar } from '@/ui/ProgressBar/ProgressBar';
import { PROCESSING } from './simulated-gsap-text';
import styles from './GsapProgress.module.css';

export function GsapProgress() {
  return (
    <div role="status" className={styles.progress}>
      <span className={styles.track}>
        <ProgressBar busy value={null} label={PROCESSING} />
      </span>
      <span>{PROCESSING}</span>
    </div>
  );
}
