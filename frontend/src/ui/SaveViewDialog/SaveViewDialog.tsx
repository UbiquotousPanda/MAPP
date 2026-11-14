import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField } from '../CheckboxField/CheckboxField';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { FormDialog } from '../FormDialog/FormDialog';
import { FormErrorSummary } from '../FormErrorSummary/FormErrorSummary';
import { FormField } from '../FormField/FormField';
import { saveViewSchema, useViewRefusal, viewNamed } from '../SavedViewsMenu/saved-views';
import type { SaveViewValues } from '../SavedViewsMenu/saved-views';
import type { SavedViewChoice } from '../SavedViewsMenu/SavedViewsMenu';
import { TextField } from '../TextField/TextField';
import { useToast } from '../Toast/useToast';
import { CHECK_ON_SAVE, useFormProblems } from '../useFormProblems';

const FIELDS = ['name'] as const;

export interface SaveViewDialogProps<V extends SavedViewChoice> {
  /** "Save current view", "Save current filters". */
  title: string;
  /** The default checkbox: "Use as my default view". */
  defaultLabel: string;
  /** Under "Replace your view '<name>'?": what the view will hold. */
  replaceText: string;
  views: V[];
  /** Saves what is on screen as a new view. */
  create: (name: string, isDefault: boolean) => Promise<V>;
  /** Saves what is on screen into the person's view of the same name. */
  replace: (view: V, isDefault: boolean) => Promise<V>;
  onSaved: (view: V) => void;
  onOpenChange: (open: boolean) => void;
}

/** A name and the default checkbox; a name in use is replaced only after asking. Mounted while open. */
export function SaveViewDialog<V extends SavedViewChoice>({
  title,
  defaultLabel,
  replaceText,
  views,
  create,
  replace,
  onSaved,
  onOpenChange,
}: SaveViewDialogProps<V>) {
  const id = useId();
  const nameField = `${id}-name`;
  const form = useForm<SaveViewValues>({
    resolver: zodResolver(saveViewSchema),
    defaultValues: { name: '', isDefault: false },
    ...CHECK_ON_SAVE,
  });
  const { problems, onInvalid, showServerProblems, clearProblems } = useFormProblems(form, FIELDS);
  const [replacing, setReplacing] = useState<V | null>(null);
  const [busy, setBusy] = useState(false);
  const refused = useViewRefusal();
  const { show } = useToast();

  async function save(saving: () => Promise<V>, verb: 'saved' | 'updated') {
    setBusy(true);
    try {
      const view = await saving();
      show({ message: `View '${view.name}' ${verb}` });
      onSaved(view);
      onOpenChange(false);
    } catch (error) {
      setReplacing(null);
      showServerProblems(refused(error));
    } finally {
      setBusy(false);
    }
  }

  const submit = form.handleSubmit(({ name, isDefault }) => {
    clearProblems();
    const existing = viewNamed(views, name);
    if (existing) {
      setReplacing(existing);
      return;
    }
    return save(() => create(name.trim(), isDefault), 'saved');
  }, onInvalid);

  return (
    <>
      <FormDialog
        open
        onOpenChange={onOpenChange}
        title={title}
        submitLabel="Save view"
        onSubmit={() => void submit()}
        busy={busy && !replacing}
      >
        <FormErrorSummary
          errors={problems}
          fieldId={(field) => (field === 'name' ? nameField : field)}
        />
        <FormField
          control={form.control}
          name="name"
          render={(field) => (
            <TextField label="Name" marking="Required" {...field} name={nameField} />
          )}
        />
        <FormField
          control={form.control}
          name="isDefault"
          render={(field) => (
            <CheckboxField
              label={defaultLabel}
              name={`${id}-default`}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormDialog>
      {replacing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setReplacing(null)}
          title={`Replace your view '${replacing.name}'?`}
          confirmLabel="Replace view"
          onConfirm={() =>
            void save(() => replace(replacing, form.getValues('isDefault')), 'updated')
          }
          busy={busy}
        >
          {replaceText}
        </ConfirmDialog>
      )}
    </>
  );
}
