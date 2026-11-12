import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../cx';
import styles from './Button.module.css';

// primary: the one main action of a view; tertiary: no frame; danger: confirms a removal.
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A lucide icon before the label; alone, it needs an aria-label. */
  icon?: ReactNode;
}

export interface ButtonProps extends ComponentProps<'button'>, ButtonLook {}

export interface LinkButtonProps extends ComponentProps<typeof Link>, ButtonLook {}

// Label it with a verb, never disable it without saying why; while aria-busy it ignores clicks.
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  onClick,
  ...buttonProps
}: ButtonProps) {
  const busy = buttonProps['aria-busy'] === true || buttonProps['aria-busy'] === 'true';
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, children == null, className)}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  );
}

/** A link that looks like a Button, for actions that open another page ("Go to Home"). */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...linkProps
}: LinkButtonProps) {
  return (
    <Link className={buttonClassName(variant, size, children == null, className)} {...linkProps}>
      {icon}
      {children}
    </Link>
  );
}

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  iconOnly: boolean,
  className: string | undefined,
): string {
  return cx(styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className);
}
