/** Navigation state for a link that opens its page at the top, even the page already on screen (the logo). */
export const TO_TOP = { toTop: true } as const;

export function isToTop(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'toTop' in state;
}
