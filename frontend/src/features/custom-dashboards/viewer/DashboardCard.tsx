import { useNavigate } from 'react-router';
import { plural } from '@/format/text';
import { useFormatters } from '@/format/useFormatters';
import { isShown } from '@/session/access';
import type { Availability } from '@/session/access';
import { ActionsMenu } from '@/ui/ActionsMenu/ActionsMenu';
import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import { TeamPills } from '@/ui/TeamPill/TeamPill';
import { Tile, TileList } from '@/ui/Tile/Tile';
import type { CustomDashboardSummary } from '../model';
import { CUSTOM_ART, EXECUTIVE_ART, REGIONAL_ART } from './dashboard-art';
import styles from './DashboardListPage.module.css';

interface DashboardCardProps {
  dashboard: CustomDashboardSummary;
  isMine: boolean;
  canBuild: boolean;
  onCopy: (id: string) => void;
  onDelete: (dashboard: CustomDashboardSummary) => void;
}

export function DashboardCard({
  dashboard,
  isMine,
  canBuild,
  onCopy,
  onDelete,
}: DashboardCardProps) {
  const navigate = useNavigate();
  const { dateTime } = useFormatters();
  const href = `/dashboards/${encodeURIComponent(dashboard.id)}`;
  const items = menuItems(
    dashboard,
    { isMine, canBuild },
    {
      open: () => void navigate(href),
      edit: () => void navigate(`/builder/${encodeURIComponent(dashboard.id)}`),
      copy: () => onCopy(dashboard.id),
      remove: () => onDelete(dashboard),
    },
  );

  return (
    <Tile
      title={dashboard.name}
      to={href}
      headingLevel={3}
      accent={isMine ? 4 : 3}
      picture={CUSTOM_ART}
      aside={<ActionsMenu label={dashboard.name} items={items} />}
      foot={`By ${dashboard.owner.name} · Updated ${dateTime(dashboard.updatedAt)} · ${plural(dashboard.widgetCount, 'widget')}`}
    >
      {dashboard.description && <p className={styles.description}>{dashboard.description}</p>}
      {dashboard.sharedWith.length > 0 ? (
        <TeamPills teams={dashboard.sharedWith} />
      ) : (
        <p className={styles.facts}>Not shared</p>
      )}
    </Tile>
  );
}

interface MenuActions {
  open: () => void;
  edit: () => void;
  copy: () => void;
  remove: () => void;
}

// The API explains why a shared dashboard can't be changed; its viewers aren't offered the change at all.
function menuItems(
  { access }: CustomDashboardSummary,
  { isMine, canBuild }: { isMine: boolean; canBuild: boolean },
  actions: MenuActions,
): ActionsMenuItem[] {
  const items: ActionsMenuItem[] = [{ label: 'Open', onSelect: actions.open }];
  if (isMine && isShown(access.edit)) {
    items.push({ label: 'Edit', onSelect: actions.edit, ...availability(access.edit) });
  }
  if (canBuild && isShown(access.copy)) {
    items.push({ label: 'Make a copy', onSelect: actions.copy, ...availability(access.copy) });
  }
  if (isMine && isShown(access.delete)) {
    items.push({
      label: 'Delete',
      tone: 'danger',
      separatorBefore: true,
      onSelect: actions.remove,
      ...availability(access.delete),
    });
  }
  return items;
}

function availability(action: Availability) {
  return { disabled: !action.available, hint: action.reason || undefined };
}

const BUILT_IN = [
  {
    kind: 'executive',
    name: 'Executive dashboard',
    text: 'Budget, planned cost and spend of every market you may see',
    picture: EXECUTIVE_ART,
  },
  {
    kind: 'regional',
    name: 'Regional dashboard',
    text: 'The same for one market, with its plans and campaigns',
    picture: REGIONAL_ART,
  },
] as const;

export function BuiltInCards() {
  return (
    <TileList>
      {BUILT_IN.map((card) => (
        <Tile
          key={card.kind}
          title={card.name}
          to={`/dashboards/${card.kind}`}
          headingLevel={3}
          accent={1}
          picture={card.picture}
          foot="Built in"
        >
          <p className={styles.description}>{card.text}</p>
        </Tile>
      ))}
    </TileList>
  );
}
