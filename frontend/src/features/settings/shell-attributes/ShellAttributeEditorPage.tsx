import { useParams } from 'react-router';
import { useAddressParams } from '@/ui/useAddressParams';
import { ApiError } from '@/api/errors';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { LEVEL_WORDS } from './attribute-words';
import { useShellAttribute } from './api';
import { AttributeForm } from './AttributeForm';
import { levelOf } from './schemas';
import { AttributeNotFound } from './ShellAttributePage';

export interface ShellAttributeEditorPageProps {
  /** create: /settings/shell-attributes/new; edit: /settings/shell-attributes/:attributeId/edit. */
  mode: 'create' | 'edit';
}

/** The Shell attribute editor, one full page for create and edit. */
export function ShellAttributeEditorPage({ mode }: ShellAttributeEditorPageProps) {
  return mode === 'create' ? <CreateAttribute /> : <EditAttribute />;
}

function CreateAttribute() {
  usePageTitle('New Shell attribute');
  const [params] = useAddressParams();
  const level = levelOf(params) ?? 'plan';

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Settings', to: '/settings' },
          { label: 'Shell attributes', to: `/settings/shell-attributes?level=${level}` },
          { label: 'New Shell attribute' },
        ]}
        title="New Shell attribute"
      />
      <AttributeForm level={level} />
    </>
  );
}

function EditAttribute() {
  const { attributeId = '' } = useParams();
  const attribute = useShellAttribute(attributeId);
  usePageTitle(attribute.data ? `Edit ${attribute.data.label}` : 'Edit Shell attribute');

  if (attribute.data) {
    const { id, label, level } = attribute.data;
    return (
      <>
        <PageHeader
          breadcrumb={[
            { label: 'Settings', to: '/settings' },
            { label: 'Shell attributes', to: '/settings/shell-attributes' },
            {
              label: `${LEVEL_WORDS[level]} form`,
              to: `/settings/shell-attributes?level=${level}`,
            },
            { label, to: `/settings/shell-attributes/${id}` },
            { label: 'Edit' },
          ]}
          title={`Edit Shell attribute '${label}'`}
        />
        {/* The edit-form rule: the attribute is copied into the form once, when it opens. */}
        <AttributeForm key={id} level={level} attribute={attribute.data} />
      </>
    );
  }

  const notFound = attribute.error instanceof ApiError && attribute.error.kind === 'notFound';
  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Settings', to: '/settings' },
          { label: 'Shell attributes', to: '/settings/shell-attributes' },
          { label: 'Edit' },
        ]}
        title="Edit Shell attribute"
      />
      <Card>
        {notFound ? (
          <AttributeNotFound />
        ) : attribute.isError ? (
          <ErrorState error={attribute.error} onRetry={() => attribute.refetch()} />
        ) : (
          <Skeleton lines={6} height="18px" />
        )}
      </Card>
    </>
  );
}
