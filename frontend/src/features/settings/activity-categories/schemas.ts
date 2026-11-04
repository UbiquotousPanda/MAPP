import { z } from 'zod';

/** The activity category form's values, as typed; the API checks them. */
export const activityCategorySchema = z.object({
  name: z.string(),
  isDefault: z.boolean(),
  activityTypeIds: z.array(z.string()),
});

export type ActivityCategoryValues = z.infer<typeof activityCategorySchema>;
