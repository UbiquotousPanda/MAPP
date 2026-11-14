import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { campaignForm } from '@/testing/fixtures/attribute-forms';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { useAttributeForm } from './api';

function FormLevel() {
  const form = useAttributeForm('campaign');
  return <p>{form.data ? `sections: ${form.data.sections.length}` : 'loading'}</p>;
}

describe('settingsQueries (feature 002)', () => {
  it('asks for the attribute form again every time a form opens (SC-008)', async () => {
    const api = mockApi([
      reply(
        'GET /api/v1/shell-attribute-forms/{level}',
        { body: campaignForm() },
        { level: 'campaign' },
      ),
    ]);
    const { user } = renderWithProviders(<OpenAndClose />);
    const asked = () =>
      api.requests.filter((request) => request.path === '/api/v1/shell-attribute-forms/campaign');

    expect(await screen.findByText('sections: 2')).toBeInTheDocument();
    expect(asked()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Close the form' }));
    await user.click(screen.getByRole('button', { name: 'Open the form' }));

    await waitFor(() => expect(asked()).toHaveLength(2));
  });
});

/** A form that is closed and opened again in the same session. */
function OpenAndClose() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? 'Close the form' : 'Open the form'}
      </button>
      {open && <FormLevel />}
    </>
  );
}
