import { Popover as Radix } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cx } from '../cx';
import floating from './floating.module.css';

export type FloatingWidth = 'auto' | 'sm' | 'md' | 'lg' | 'anchor';
export type FloatingPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<FloatingPadding, string | undefined> = {
  none: floating.padNone,
  sm: floating.padSm,
  md: floating.padMd,
  lg: floating.padLg,
};

export interface PopoverContentProps extends ComponentProps<typeof Radix.Content> {
  width?: FloatingWidth;
  padding?: FloatingPadding;
}

function Content({
  width = 'auto',
  padding = 'md',
  align = 'start',
  sideOffset = 6,
  className,
  ...props
}: PopoverContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content
        className={cx(floating.surface, floating[width], PADDING[padding], className)}
        align={align}
        sideOffset={sideOffset}
        {...props}
      />
    </Radix.Portal>
  );
}

/** A popover on the shared floating surface (design system §5.2); Radix handles the focus. */
export const Popover = {
  Root: Radix.Root,
  Trigger: Radix.Trigger,
  Anchor: Radix.Anchor,
  Close: Radix.Close,
  Content,
};
