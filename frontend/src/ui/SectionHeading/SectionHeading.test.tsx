import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from './SectionHeading';

describe('SectionHeading', () => {
  it('is a heading of the level asked for, whatever its rank looks like', () => {
    render(
      <section aria-labelledby="t">
        <SectionHeading level={3} rank="section" id="t">
          Revenue
        </SectionHeading>
      </section>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBeInTheDocument();
  });
});
