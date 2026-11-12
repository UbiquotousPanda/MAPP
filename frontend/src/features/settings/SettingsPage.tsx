import { ChevronRight, CircleAlert, RotateCw } from 'lucide-react';
import { Link } from 'react-router';
import { itemsFor, useAccess } from '@/session/access';
import type { components } from '@/api/generated/schema';
import { Button } from '@/ui/Button/Button';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { usePageTitle } from '@/ui/usePageTitle';
import { SettingsCount } from '@/ui/SettingsCount/SettingsCount';
import linkCard from '@/ui/LinkCard/LinkCard.module.css';
import type { SettingsSection } from './sections';
import styles from './SettingsPage.module.css';
import { useSettingsOverview } from './api';

type SettingsOverview = components['schemas']['SettingsOverview'];

type Counts =
  { state: 'loading' } | { state: 'failed' } | { state: 'loaded'; overview: SettingsOverview };

/** When the counts can't be loaded the cards stay usable; a card the person's roles do not open is left out. */
export function SettingsPage({ sections }: { sections: SettingsSection[] }) {
  usePageTitle('Settings');
  const { has } = useAccess();
  const overview = useSettingsOverview();
  const counts: Counts = overview.data
    ? { state: 'loaded', overview: overview.data }
    : overview.isError
      ? { state: 'failed' }
      : { state: 'loading' };

  return (
    <>
      <PageHeader title="Settings" description="Changes apply to everyone straight away." />
      {counts.state === 'failed' && (
        <div role="alert" className={styles.countsFailed}>
          <CircleAlert aria-hidden="true" />
          <p>Counts couldn&apos;t be loaded.</p>
          <Button size="sm" icon={<RotateCw />} onClick={() => void overview.refetch()}>
            Try again
          </Button>
        </div>
      )}
      <ul role="list" aria-label="Sections" className={styles.grid}>
        {itemsFor(sections, has).map((section) => (
          <SectionCard key={section.path} section={section} counts={counts} />
        ))}
      </ul>
    </>
  );
}

interface SectionCardProps {
  section: SettingsSection;
  counts: Counts;
}

/** One section: the whole card opens it; the link itself is named by the section's title. */
function SectionCard({ section, counts }: SectionCardProps) {
  const Icon = section.icon;
  const comingSoon = section.comingSoon === true;

  return (
    <li className={comingSoon ? styles.card : `${styles.card} ${styles.linkCard}`}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          <Icon />
        </span>
        <h2 className={styles.title}>
          {comingSoon ? (
            section.title
          ) : (
            <Link to={section.path} className={linkCard.link}>
              {section.title}
            </Link>
          )}
        </h2>
        {!comingSoon && (
          <span className={styles.chevron} aria-hidden="true">
            <ChevronRight />
          </span>
        )}
      </div>
      <p className={styles.description}>{section.description}</p>
      <div className={styles.footer}>
        {comingSoon ? (
          <StatusChip tone="neutral">Coming soon</StatusChip>
        ) : (
          <ActiveCount section={section} counts={counts} />
        )}
      </div>
    </li>
  );
}

/** Other features' sections show it from their own component, with the same SettingsCount. */
function ActiveCount({ section, counts }: SectionCardProps) {
  if (!section.overviewKey) {
    return section.ActiveCount ? <section.ActiveCount /> : null;
  }
  return (
    <SettingsCount
      loading={counts.state === 'loading'}
      count={counts.state === 'loaded' ? counts.overview[section.overviewKey] : undefined}
    />
  );
}
