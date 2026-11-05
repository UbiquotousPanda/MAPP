/** "GSAP rates as of 10:45": when the simulated GSAP rates were last refreshed, in the viewer's time. */
export function asOfText(asOf: string): string {
  const time = new Date(asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `GSAP rates as of ${time}`;
}
