import { z } from 'zod';
import { parseDecimalInput } from '@/format/decimal';

const MAX_VELOCITY_MONTHS = 24;
const VELOCITY_MESSAGE = 'Enter a whole number of months from 0 to 24.';

/** A typed velocity in whole months, or null unless it is one from 0 to 24. */
export function velocityMonths(typed: string): number | null {
  const whole = parseDecimalInput(typed, 0);
  const months = whole === null ? Number.NaN : Number(whole);
  return Number.isInteger(months) && months >= 0 && months <= MAX_VELOCITY_MONTHS ? months : null;
}

const velocitySchema = z
  .string()
  .refine((typed) => velocityMonths(typed) !== null, { message: VELOCITY_MESSAGE });

/** The model form's values as typed: velocity is checked here, so it is never sent truncated; the API checks the rest. */
export const modelSchema = z.object({
  name: z.string(),
  inqToMqlRate: z.string(),
  mqlToDealRate: z.string(),
  averageDealSize: z.string(),
  activityTypeIds: z.array(z.string()),
  inqToMqlVelocityMonths: velocitySchema,
  mqlToDealVelocityMonths: velocitySchema,
  allowedGoalStages: z.array(z.enum(['inq', 'mql', 'revenue'])),
});

export type ModelValues = z.infer<typeof modelSchema>;

export type GoalStage = ModelValues['allowedGoalStages'][number];
