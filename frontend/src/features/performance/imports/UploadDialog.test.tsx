import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import {
  performanceLoad,
  performanceSource,
  SIMULATED_SOURCE,
} from '@/testing/fixtures/performance';
import { testUser } from '@/testing/fixtures/users';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { apiError, pending, reply } from '@/testing/replies';
import type { Answer } from '@/testing/replies';
import { ImportsPage } from './ImportsPage';

const UPLOAD = 'POST /api/v1/performance/sources/{sourceId}/uploads';
const CSV = new File(['Ref,Date,Activity,INQ\nr1,2026-10-01,A-1001,40\n'], 'eloqua-october.csv', {
  type: 'text/csv',
});

function renderPage(
  upload: Answer<typeof UPLOAD>,
  sources = [performanceSource(), SIMULATED_SOURCE],
) {
  const api = mockApi([
    reply('GET /api/v1/performance/sources', { body: { items: sources } }),
    reply('GET /api/v1/performance/imports', { body: { items: [] } }),
    reply(UPLOAD, upload),
    reply('POST /api/v1/performance/sources/{sourceId}/pull', {
      status: 201,
      body: performanceLoad({ id: 'PIM-1009', origin: 'simulated', sourceId: 'PS-1002' }),
    }),
  ]);
  const rendered = renderWithProviders(<ImportsPage />, {
    user: testUser(),
    route: '/settings/performance-data/imports',
    path: '/settings/performance-data/imports',
  });
  return { api, ...rendered };
}

async function openUpload(user: ReturnType<typeof renderPage>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Upload a file' }));
  return screen.findByRole('dialog', { name: 'Upload a file' });
}

describe('UploadDialog', () => {
  it('046 FR-009 sends the chosen CSV for its source and opens the summary of the load', async () => {
    const { api, user, router } = renderPage({ status: 201, body: performanceLoad() });
    const dialog = await openUpload(user);

    await user.upload(within(dialog).getByLabelText(/^File/), CSV);
    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/settings/performance-data/imports/PIM-1001'),
    );
    const [body] = api.bodiesOf('POST /api/v1/performance/sources/PS-1001/uploads');
    expect(body).toEqual({ fileName: 'eloqua-october.csv', content: expect.any(String) });
  });

  it('046 FR-009 shows every problem at once when no source and no CSV are chosen', async () => {
    const { user } = renderPage({ status: 201, body: performanceLoad() }, [
      performanceSource(),
      performanceSource({ id: 'PS-1003', name: 'Salesforce' }),
    ]);
    const dialog = await openUpload(user);

    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));

    expect(
      await within(dialog).findByText('Choose the data source this file comes from.'),
    ).toBeVisible();
    expect(within(dialog).getByText('Choose a UTF-8 CSV file (.csv).')).toBeVisible();
    await expectNoAxeViolations();
  });

  it('046 FR-009 says the file is uploading while the API works on it', async () => {
    const { user } = renderPage(() => pending());
    const dialog = await openUpload(user);

    await user.upload(within(dialog).getByLabelText(/^File/), CSV);
    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Uploading eloqua-october.csv…',
    );
  });

  it('046 FR-012 shows why a file was refused whole, at the file', async () => {
    const refusal =
      'This file carries personal data in the columns E-mail, Phone. Remove them and upload it again.';
    const { user } = renderPage({ status: 409, body: apiError('not_allowed', refusal) });
    const dialog = await openUpload(user);

    await user.upload(within(dialog).getByLabelText(/^File/), CSV);
    await user.click(within(dialog).getByRole('button', { name: 'Upload' }));

    expect(await within(dialog).findByText(refusal)).toBeVisible();
    expect(within(dialog).getByLabelText(/^File/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('046 FR-009 closes on Escape without uploading anything', async () => {
    const { api, user } = renderPage({ status: 201, body: performanceLoad() });
    await openUpload(user);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('046 FR-010 046-C13 pulls the simulated feed only when asked, and opens its summary', async () => {
    const { api, user, router } = renderPage({ status: 201, body: performanceLoad() });
    expect(api.requests.some((r) => r.path.endsWith('/pull'))).toBe(false);

    await user.click(await screen.findByRole('button', { name: 'Pull simulated feed' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pull simulated feed' });
    await user.click(within(dialog).getByRole('button', { name: 'Pull feed' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/settings/performance-data/imports/PIM-1009'),
    );
    expect(
      api.requests.filter((r) => r.path === '/api/v1/performance/sources/PS-1002/pull'),
    ).toHaveLength(1);
  });
});
