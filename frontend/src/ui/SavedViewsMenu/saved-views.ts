import { useCallback } from 'react';
import { z } from 'zod';
import { asApiError, isSessionLost } from '@/api/errors';
import type { FieldProblem } from '../FormErrorSummary/FormErrorSummary';
import { useToast } from '../Toast/useToast';
import type { SavedViewChoice } from './SavedViewsMenu';

const NAME_MAX = 60;
const VIEW_GONE = 'This view no longer exists — it may have been deleted in another tab.';

const viewName = z
  .string()
  .refine((name) => name.trim() !== '', 'Enter a name for the view.')
  .refine((name) => [...name.trim()].length <= NAME_MAX, 'Use 60 characters or fewer.');

export const saveViewSchema = z.object({ name: viewName, isDefault: z.boolean() });
export type SaveViewValues = z.infer<typeof saveViewSchema>;

/** The person's other view with this name, ignoring letter case: names are unique per person. */
export function viewNamed<V extends SavedViewChoice>(views: V[], name: string, except?: string) {
  const wanted = name.trim().toLocaleLowerCase();
  return views.find((view) => view.id !== except && view.name.toLocaleLowerCase() === wanted);
}

export function renameViewSchema(views: SavedViewChoice[], viewId: string) {
  return z.object({
    name: viewName.superRefine((name, context) => {
      if (viewNamed(views, name, viewId)) {
        context.addIssue({
          code: 'custom',
          message: `You already have a view called '${name.trim()}'.`,
        });
      }
    }),
  });
}

/** A refused change: the name's problems for the form; anything else, a stale version too, as a message. */
export function useViewRefusal(): (error: unknown) => FieldProblem[] {
  const { show } = useToast();
  return useCallback(
    (error: unknown) => {
      const failure = asApiError(error);
      if (failure.kind === 'validation' && failure.fields.length > 0) {
        return failure.fields.map(({ field, message }) => ({ field, message }));
      }
      if (!isSessionLost(failure)) {
        show({ message: failure.kind === 'notFound' ? VIEW_GONE : failure.message });
      }
      return [];
    },
    [show],
  );
}
