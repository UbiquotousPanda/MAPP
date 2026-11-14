import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog } from '../FormDialog/FormDialog';
import { FormErrorSummary } from '../FormErrorSummary/FormErrorSummary';
import { FormField } from '../FormField/FormField';
import { renameViewSchema, useViewRefusal } from '../SavedViewsMenu/saved-views';
import type { SavedViewChoice } from '../SavedViewsMenu/SavedViewsMenu';
import { TextField } from '../TextField/TextField';
import { useToast } from '../Toast/useToast';
import { CHECK_ON_SAVE, useFormProblems } from '../useFormProblems';

const FIELDS = ['name'] as const;

interface RenameViewDialogProps<V extends SavedViewChoice> {
  view: V;
  views: V[];
  rename: (view: V, name: string) => Promise<V>;
  onClose: () => void;
}

/** The same name rules as saving; another view's name is refused. */
export function RenameViewDialog<V extends SavedViewChoice>({
  view,
  views,
  rename,
  onClose,
}: RenameViewDialogProps<V>) {
  const id = useId();
  const nameField = `${id}-name`;
  const form = useForm<{ name: string }>({
    resolver: zodResolver(renameViewSchema(views, view.id)),
    defaultValues: { name: view.name },
    ...CHECK_ON_SAVE,
  });
  const { problems, onInvalid, showServerProblems } = useFormProblems(form, FIELDS);
  const [busy, setBusy] = useState(false);
  const refused = useViewRefusal();
  const { show } = useToast();

  const submit = form.handleSubmit(async ({ name }) => {
    setBusy(true);
    try {
      const saved = await rename(view, name.trim());
      show({ message: `View '${saved.name}' renamed` });
      onClose();
    } catch (error) {
      const apiProblems = refused(error);
      if (apiProblems.length > 0) {
        showServerProblems(apiProblems);
      } else {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }, onInvalid);

  return (
    <FormDialog
      open
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Rename view"
      submitLabel="Rename view"
      onSubmit={() => void submit()}
      busy={busy}
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
    </FormDialog>
  );
}
