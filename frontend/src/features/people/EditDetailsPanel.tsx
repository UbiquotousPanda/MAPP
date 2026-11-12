import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCurrentUser } from '@/session/useSession';
import { FormField } from '@/ui/FormField/FormField';
import { FormPanel } from '@/ui/FormPanel/FormPanel';
import type { SaveFailure } from '@/ui/FormPanel/problem-of';
import { TextField } from '@/ui/TextField/TextField';
import { useToast } from '@/ui/Toast/useToast';
import { useEditedRecord } from '@/ui/useEditedRecord';
import { CHECK_ON_SAVE, useFormProblems } from '@/ui/useFormProblems';
import { useFormatters } from '@/format/useFormatters';
import { fetchLatestPerson, useUpdateProfile } from './api';
import { formFailure } from './feedback';
import { detailsSchema } from './schemas';
import type { DetailsValues } from './schemas';

const FIELDS = ['name', 'jobTitle'] as const;

// The signed-in person's name and job title; the e-mail is the sign-in name, changed in
// Settings › People.
export function EditDetailsPanel({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const { dateFormat } = useFormatters();
  const updateProfile = useUpdateProfile();
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: user.name, jobTitle: user.jobTitle },
    ...CHECK_ON_SAVE,
  });
  const { problems, onInvalid, showServerProblems } = useFormProblems(form, FIELDS);
  const { version, loadLatest } = useEditedRecord({ version: user.version });
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);

  async function save({ name, jobTitle }: DetailsValues) {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({ name, jobTitle, version });
      show({ message: 'Your details saved' });
      onClose();
    } catch (error) {
      const result = formFailure(error, 'profile', dateFormat);
      showServerProblems(result.problems);
      setFailure(result.failure);
      if (result.conflict) {
        await loadLatest(() => fetchLatestPerson(queryClient, user.id));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel
      title="Edit your details"
      isDirty={form.formState.isDirty}
      saving={saving}
      problems={problems}
      failure={failure}
      onSave={() => void form.handleSubmit(save, onInvalid)()}
      onClose={onClose}
    >
      <FormField
        control={form.control}
        name="name"
        render={(field) => (
          <TextField label="Name" marking="Required" autoComplete="name" {...field} />
        )}
      />
      <FormField
        control={form.control}
        name="jobTitle"
        render={(field) => (
          <TextField label="Job title" autoComplete="organization-title" {...field} />
        )}
      />
    </FormPanel>
  );
}
