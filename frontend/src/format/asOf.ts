import { formatTime } from './intl';

/** "GSAP rates as of 10:45": when the rates last changed or a refresh confirmed them, in the viewer's time. */
export function asOfText(asOf: string): string {
  return `GSAP rates as of ${formatTime(asOf)}`;
}
