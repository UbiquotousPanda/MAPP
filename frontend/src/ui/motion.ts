export function scrollBehavior(): ScrollBehavior {
  const lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return lessMotion ? 'auto' : 'smooth';
}
