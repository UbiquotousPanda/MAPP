import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/ui/Avatar/Avatar';
import { Menu } from '@/ui/Menu/Menu';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { useCurrentUser, useSession } from '@/session/useSession';
import styles from './AccountMenu.module.css';
import { MY_PROFILE } from './navigation';

export function AccountMenu() {
  const person = useCurrentUser();
  const { signOut } = useSession();

  return (
    <Menu.Root>
      <Tooltip content={[person.name, person.jobTitle].filter(Boolean).join(' — ')}>
        <Menu.Trigger asChild>
          {/* The button's name comes from its text, "Priya — account menu", so it always contains
              the words written on it (WCAG 2.5.3, label in name). */}
          <button type="button" className={styles.button}>
            <Avatar initials={person.initials} />
            <span className={styles.name}>{person.firstName}</span>{' '}
            <span className="visually-hidden">— account menu</span>
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </button>
        </Menu.Trigger>
      </Tooltip>
      <Menu.Content side="bottom" sideOffset={8}>
        <Menu.Label className={styles.header}>
          <Avatar initials={person.initials} size="lg" />
          <span className={styles.details}>
            <span className={styles.fullName}>{person.name}</span>
            <span className={styles.detail}>{person.email}</span>
            <span className={styles.detail}>{person.jobTitle}</span>
          </span>
        </Menu.Label>
        <Menu.Separator />
        <Menu.Item asChild>
          <Link to={MY_PROFILE.path}>
            <UserRound aria-hidden="true" />
            {MY_PROFILE.label}
          </Link>
        </Menu.Item>
        <Menu.Item icon={<LogOut aria-hidden="true" />} onChoose={signOut}>
          Sign out
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
