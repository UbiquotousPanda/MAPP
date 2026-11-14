import { ChevronDown, Ellipsis } from 'lucide-react';
import { Fragment } from 'react';
import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import { Tooltip } from '../Tooltip/Tooltip';
import { useHidesUnavailable } from '../ViewOnlyNote/view-only-context';

export interface ActionsMenuItem {
  label: string;
  onSelect: () => void;
  tone?: 'danger';
  separatorBefore?: boolean;
  /** A second, smaller line under the label, read with it: the reason of a disabled item. */
  hint?: string;
  /** Shown, not chosen, with its reason as the hint; left out inside a ViewOnlyArea. */
  disabled?: boolean;
}

export interface ActionsMenuProps {
  label: string;
  items: ActionsMenuItem[];
  /** "icon": the ⋯ of a row or card; "more": the **More** button of a page header or panel. */
  trigger?: 'icon' | 'more';
}

export function ActionsMenu({ label, items, trigger = 'icon' }: ActionsMenuProps) {
  const hidesUnavailable = useHidesUnavailable();
  const shown = hidesUnavailable ? items.filter((item) => !item.disabled) : items;

  return (
    <Menu.Root>
      {trigger === 'more' ? (
        <Menu.Trigger asChild>
          <Button>
            More
            <ChevronDown aria-hidden="true" />
          </Button>
        </Menu.Trigger>
      ) : (
        <Tooltip content={`Actions for ${label}`}>
          <Menu.Trigger asChild>
            <Button
              variant="tertiary"
              size="sm"
              icon={<Ellipsis />}
              aria-label={`Actions for ${label}`}
            />
          </Menu.Trigger>
        </Tooltip>
      )}
      <Menu.Content>
        {shown.map((item) => (
          <Fragment key={item.label}>
            {item.separatorBefore && <Menu.Separator />}
            <Menu.Item
              tone={item.tone}
              hint={item.hint}
              disabled={item.disabled}
              onChoose={item.onSelect}
            >
              {item.label}
            </Menu.Item>
          </Fragment>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
