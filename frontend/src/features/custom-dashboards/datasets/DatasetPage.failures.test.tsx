import { screen, waitFor, within } from '@testing-library/react';
import type { HttpHandler } from 'msw';
import { describe, expect, it } from 'vitest';
import { dataset, rowPage } from '@/testing/fixtures/datasets';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { findMessages, renderWithProviders } from '@/testing/render';
import { apiError, reply } from '@/testing/replies';
import { DatasetPage } from './DatasetPage';

function renderDataset(answers: HttpHandler[]) {
  const api = mockApi([
    reply('GET /api/v1/datasets/{datasetId}', { body: dataset() }),
    reply('GET /api/v1/datasets/{datasetId}/rows', { body: rowPage(0, 10, 10) }),
    ...answers,
  ]);
  const view = renderWithProviders(<DatasetPage />, {
    route: '/datasets/DS-1001',
    path: '/datasets/:datasetId',
    user: testUser(),
  });
  return { ...view, api };
}

async function openEdit(answers: HttpHandler[]) {
  const view = renderDataset(answers);
  await view.user.click(await screen.findByRole('button', { name: 'Edit' }));
  const panel = await screen.findByRole('dialog', { name: 'Edit dataset' });
  return { ...view, panel };
}

describe('051 FR-043, FR-044: Edit dataset reports every problem where it is', () => {
  it('shows every empty field at once and sends nothing', async () => {
    const { user, api, panel } = await openEdit([]);

    await user.clear(within(panel).getByLabelText('Name'));
    await user.clear(within(panel).getByLabelText('Column 2'));
    await user.click(within(panel).getByRole('button', { name: 'Save' }));

    expect(within(panel).getByLabelText('Name')).toHaveAccessibleDescription(/Enter a name\./);
    expect(within(panel).getByLabelText('Column 2')).toHaveAccessibleDescription(
      /Enter a column name\./,
    );
    expect(api.bodiesOf('PATCH /api/v1/datasets/DS-1001')).toEqual([]);
  });

  it('shows the server’s refusal of a column name next to that column', async () => {
    const { user, panel } = await openEdit([
      reply('PATCH /api/v1/datasets/{datasetId}', {
        status: 400,
        body: apiError('validation_failed', 'Check the dataset.', {
          fields: [{ field: 'columns[2].label', message: "Another column is called 'Event'." }],
        }),
      }),
    ]);

    await user.clear(within(panel).getByLabelText('Column 3'));
    await user.type(within(panel).getByLabelText('Column 3'), 'Event');
    await user.click(within(panel).getByRole('button', { name: 'Save' }));

    expect(
      await within(panel).findByLabelText('Column 3', { selector: '[aria-invalid="true"]' }),
    ).toHaveAccessibleDescription(/Another column is called 'Event'\./);
    expect(screen.getByRole('dialog', { name: 'Edit dataset' })).toBeInTheDocument();
  });

  it('keeps the changes after a newer version, saying who changed it', async () => {
    const { user, panel } = await openEdit([
      reply('PATCH /api/v1/datasets/{datasetId}', {
        status: 409,
        body: apiError('version_conflict', 'Someone else changed this dataset.', {
          conflict: { changedBy: 'Daniel Okoro', changedAt: '2026-10-30T09:15:00Z' },
        }),
      }),
    ]);

    await user.clear(within(panel).getByLabelText('Name'));
    await user.type(within(panel).getByLabelText('Name'), 'Leads 2026');
    await user.click(within(panel).getByRole('button', { name: 'Save' }));

    expect(
      await within(panel).findByText(/Not saved — Daniel Okoro changed this dataset/),
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(
      'Your changes are still here. Cancel and open Edit again to start from theirs.',
    );
    expect(within(panel).getByLabelText('Name')).toHaveValue('Leads 2026');
  });
});

describe('051 FR-045: a failed dataset delete', () => {
  it('closes the question, names the reason, offers no Undo and stays on the dataset', async () => {
    const { user, router } = renderDataset([
      reply('DELETE /api/v1/datasets/{datasetId}', {
        status: 404,
        body: apiError('not_found', 'Dataset not found.'),
      }),
    ]);

    await user.click(await screen.findByRole('button', { name: 'More' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete dataset' }));

    const messages = await findMessages();
    await waitFor(() => expect(messages).toHaveTextContent('Dataset not found.'));
    expect(within(messages).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/datasets/DS-1001');
  });
});
