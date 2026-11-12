const STAGE_WORDS: Record<string, string> = {
  inq: 'Inquiries (INQ)',
  mql: 'Marketing-qualified leads (MQL)',
};

export function stageName(stage: string): string {
  return STAGE_WORDS[stage] ?? stage;
}
