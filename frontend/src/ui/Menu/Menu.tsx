import { Check } from 'lucide-react';
import { DropdownMenu as Radix } from 'radix-ui';
import { createContext, useContext, useId, useRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '../cx';
import floating from '../Popover/floating.module.css';
import styles from './Menu.module.css';

const RememberChoice = createContext<((action: () => void) => void) | null>(null);

function Root(props: ComponentProps<typeof Radix.Root>) {
  return <Radix.Root modal={false} {...props} />;
}

// An item's onChoose runs once the menu has given the focus back to its trigger, so a dialog it
// opens returns the focus there when it closes.
function Content({
  align = 'end',
  sideOffset = 4,
  className,
  children,
  ...props
}: ComponentProps<typeof Radix.Content>) {
  const chosenRef = useRef<(() => void) | null>(null);
  const remember = (action: () => void) => {
    chosenRef.current = action;
  };
  return (
    <Radix.Portal>
      <Radix.Content
        className={cx(floating.surface, floating.auto, floating.padSm, className)}
        align={align}
        sideOffset={sideOffset}
        onCloseAutoFocus={() => {
          const action = chosenRef.current;
          chosenRef.current = null;
          action?.();
        }}
        {...props}
      >
        <RememberChoice.Provider value={remember}>{children}</RememberChoice.Provider>
      </Radix.Content>
    </Radix.Portal>
  );
}

function useChoose(onChoose: (() => void) | undefined) {
  const remember = useContext(RememberChoice);
  return () => {
    if (onChoose) {
      remember?.(onChoose);
    }
  };
}

export interface MenuItemProps extends Omit<ComponentProps<typeof Radix.Item>, 'onSelect'> {
  onChoose?: () => void;
  hint?: string;
  icon?: ReactNode;
  tone?: 'danger';
}

function Item({ onChoose, hint, icon, tone, className, children, ...props }: MenuItemProps) {
  const choose = useChoose(onChoose);
  const hintId = useId();
  return (
    <Radix.Item
      className={cx(styles.item, tone === 'danger' && styles.danger, className)}
      aria-describedby={hint ? hintId : undefined}
      onSelect={choose}
      {...props}
    >
      {props.asChild ? (
        children
      ) : (
        <>
          {icon}
          {children}
          {hint && (
            <span id={hintId} className={styles.hint} aria-hidden="true">
              {hint}
            </span>
          )}
        </>
      )}
    </Radix.Item>
  );
}

interface ChoiceProps {
  checked: boolean;
  onChoose: () => void;
  children: ReactNode;
}

function Choice({ checked, onChoose, children }: ChoiceProps) {
  const choose = useChoose(onChoose);
  return (
    <Radix.CheckboxItem className={styles.item} checked={checked} onSelect={choose}>
      <span className={styles.tick}>
        <Radix.ItemIndicator>
          <Check aria-hidden="true" />
        </Radix.ItemIndicator>
      </span>
      {children}
    </Radix.CheckboxItem>
  );
}

function Separator() {
  return <Radix.Separator className={styles.separator} />;
}

function Note({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={styles.note}>
      {children}
    </p>
  );
}

function Label({ className, ...props }: ComponentProps<typeof Radix.Label>) {
  return <Radix.Label className={cx(styles.label, className)} {...props} />;
}

/** A dropdown menu, never modal (design system §5.1); Radix handles the keyboard and focus. */
export const Menu = { Root, Trigger: Radix.Trigger, Content, Item, Choice, Separator, Note, Label };
