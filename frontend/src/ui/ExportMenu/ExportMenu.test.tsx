import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { expectNoAxeViolations } from '@/testing/axe';
import { testUser } from '@/testing/fixtures/users';
import { findMessages, renderWithProviders } from '@/testing/render';
import { ExportMenu } from './ExportMenu';

const FILE = 'SP&A One – Executive dashboard – 2026 – 28 Oct 2026.pptx';

describe('ExportMenu', () => {
  it('offers its formats and says which file it saved (036 FR-024)', async () => {
    const download = vi.fn(() => Promise.resolve(FILE));
    const { user } = renderWithProviders(
      <ExportMenu formats={['pptx', 'pdf']} download={download} />,
      { user: testUser() },
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'PowerPoint (.pptx)',
      'PDF (.pdf)',
    ]);
    await expectNoAxeViolations();
    await user.click(screen.getByRole('menuitem', { name: 'PowerPoint (.pptx)' }));

    const messages = await findMessages();
    expect(within(messages).getByText(`Exported '${FILE}'`)).toBeInTheDocument();
    expect(download).toHaveBeenCalledWith('pptx');
  });

  it('downloads its one format at once and says "Preparing your file…" meanwhile', async () => {
    let finish: (name: string) => void = () => {};
    const download = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { user } = renderWithProviders(<ExportMenu formats={['xlsx']} download={download} />, {
      user: testUser(),
    });

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(download).toHaveBeenCalledWith('xlsx');
    expect(screen.getByRole('button', { name: 'Preparing your file…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    finish('Report.xlsx');
    expect(await screen.findByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it("shows the API's message when the file cannot be made", async () => {
    const download = vi.fn(() =>
      Promise.reject(
        new ApiError('forbidden', { message: "You can't export: ask an administrator." }),
      ),
    );
    const { user } = renderWithProviders(
      <ExportMenu formats={['pptx', 'pdf']} download={download} />,
      { user: testUser() },
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(await screen.findByRole('menuitem', { name: 'PDF (.pdf)' }));

    const messages = await findMessages();
    expect(
      within(messages).getByText("You can't export: ask an administrator."),
    ).toBeInTheDocument();
  });

  it('says there is nothing to export instead of downloading', async () => {
    const download = vi.fn(() => Promise.resolve(FILE));
    const { user } = renderWithProviders(
      <ExportMenu formats={['csv']} download={download} emptyText="Nothing to export." />,
      { user: testUser() },
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(within(await findMessages()).getByText('Nothing to export.')).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
  });

  it('stays visible but disabled with its reason, named by its label when icon-only', () => {
    renderWithProviders(
      <ExportMenu
        formats={['csv', 'xlsx']}
        download={vi.fn()}
        label="Export ranked list"
        iconOnly
        refusal="Exporting isn't part of your role (Viewer)."
      />,
      { user: testUser() },
    );

    const button = screen.getByRole('button', { name: 'Export ranked list' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Exporting isn't part of your role (Viewer).");
  });
});
