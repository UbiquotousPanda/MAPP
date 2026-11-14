import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { InlineError } from './InlineError';

describe('InlineError', () => {
  it('is announced at once when it stands alone', async () => {
    render(<InlineError>The rate could not be saved.</InlineError>);

    expect(screen.getByRole('alert')).toHaveTextContent('The rate could not be saved.');
    await expectNoAxeViolations();
  });

  it('is heard with its field instead when quiet', () => {
    render(
      <>
        <input aria-label="Name" aria-describedby="name-error" />
        <InlineError id="name-error" quiet>
          Enter a name.
        </InlineError>
      </>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      'Enter a name.',
    );
  });
});
