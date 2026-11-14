import { Plus } from 'lucide-react';
import { LinkButton } from '@/ui/Button/Button';
import { CanChange, SettingsViewOnlyNote } from '@/ui/CanChange/CanChange';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { usePageTitle } from '@/ui/usePageTitle';
import { AttributeList } from './AttributeList';
import { useAttributeFilters } from './useAttributeFilters';

/** One level's attributes in the order of its form, grouped by section; the move buttons set that order. */
export function ShellAttributesPage() {
  usePageTitle('Shell attributes');
  const filters = useAttributeFilters();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Settings', to: '/settings' }, { label: 'Shell attributes' }]}
        title="Shell attributes"
        description="Changes apply to every form straight away."
        actions={
          <CanChange>
            <LinkButton
              variant="primary"
              icon={<Plus />}
              to={`/settings/shell-attributes/new?level=${filters.level}`}
            >
              New Shell attribute
            </LinkButton>
          </CanChange>
        }
      />
      <SettingsViewOnlyNote />
      <AttributeList filters={filters} />
    </>
  );
}
