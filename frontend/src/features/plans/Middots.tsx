import { Fragment } from 'react';
import type { ReactNode } from 'react';

/** Facts in one line with " · " between them, real spaces so copied text reads right; empty facts are left out. */
export function Middots({ children }: { children: ReactNode[] }) {
  const facts = children.filter((fact) => fact !== false && fact !== null && fact !== undefined);
  return facts.map((fact, index) => (
    <Fragment key={index}>
      {index > 0 && (
        <>
          {' '}
          <span aria-hidden="true">·</span>{' '}
        </>
      )}
      {fact}
    </Fragment>
  ));
}
