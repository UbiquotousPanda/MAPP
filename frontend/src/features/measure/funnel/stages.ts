export function isStage(value: string): value is 'inq' | 'mql' {
  return value === 'inq' || value === 'mql';
}
