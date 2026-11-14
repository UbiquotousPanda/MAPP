import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { InlineAlert } from './InlineAlert';

describe('InlineAlert', () => {
  it('describes the page politely, with its title first', async () => {
    render(
      <InlineAlert tone="warning" title="Waiting for approval">
        <p>Sent to Daniel Okoro.</p>
      </InlineAlert>,
    );

    const alert = screen.getByRole('status');
    expect(alert).toHaveTextContent('Waiting for approvalSent to Daniel Okoro.');
    await expectNoAxeViolations();
  });

  it('interrupts for a failure', () => {
    render(
      <InlineAlert tone="danger" role="alert">
        The plan could not be saved.
      </InlineAlert>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('The plan could not be saved.');
  });
});
