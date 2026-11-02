import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { NO_PLANS } from '@/testing/fixtures/session';
import { testUser } from '@/testing/fixtures/users';
import { widgetData } from '../charts/widget-fixtures';
import { SOURCES } from './builder-fixtures';
import { DashboardBuilderPage } from './DashboardBuilderPage';

vi.mock('echarts/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  init: () => ({ setOption: () => {}, resize: () => {}, dispose: () => {} }),
}));

async function layoutOfTwoWidgets() {
  mockApi([
    ...NO_PLANS,
    reply('GET /api/v1/teams', { body: { items: [], total: 0 } }),
    reply('GET /api/v1/data-sources', { body: { items: SOURCES } }),
    reply('POST /api/v1/data-sources/query', { body: widgetData() }),
  ]);
  const rendered = renderWithProviders(<DashboardBuilderPage />, {
    user: testUser(),
    route: '/builder',
    path: '/builder/:dashboardId?',
  });
  await rendered.user.click(screen.getByRole('button', { name: 'Add text note' }));
  await rendered.user.click(screen.getByRole('button', { name: 'Add text note' }));
  const inspector = screen.getByRole('complementary', { name: 'Inspector' });
  await rendered.user.click(within(inspector).getByRole('tab', { name: 'Layout' }));
  return { ...rendered, inspector };
}

function cellAt(column: number, row: number) {
  return screen.getByRole('group', { name: new RegExp(`, column ${column}, row ${row}$`) });
}

describe('051 US1, FR-028: the Layout tab places the selected widget by numbers', () => {
  it('takes a two-digit row typed in one go and keeps the field focused', async () => {
    const { user, inspector } = await layoutOfTwoWidgets();
    const row = within(inspector).getByLabelText('Row');

    await user.clear(row);
    await user.type(row, '30');

    expect(cellAt(5, 30)).toBeInTheDocument();
    expect(within(inspector).getByLabelText('Row')).toHaveFocus();
    expect(within(inspector).getByLabelText('Row')).toHaveValue(30);
  });

  it('refuses a place another widget holds, says why and leaves the widget where it was', async () => {
    const { user, inspector } = await layoutOfTwoWidgets();
    const before = screen
      .getAllByRole('group', { name: /^Widget: / })
      .map((cell) => cell.ariaLabel);
    const column = within(inspector).getByLabelText('Column');

    await user.clear(column);
    await user.type(column, '1');

    expect(within(inspector).getByRole('alert')).toHaveTextContent(
      "Can't move there: another widget is in the way.",
    );
    expect(
      screen.getAllByRole('group', { name: /^Widget: / }).map((cell) => cell.ariaLabel),
    ).toEqual(before);
  });

  it('drops a refused number once the widget moves on the canvas', async () => {
    const { user, inspector } = await layoutOfTwoWidgets();
    const column = within(inspector).getByLabelText('Column');
    await user.clear(column);
    await user.type(column, '1');
    expect(within(inspector).getByRole('alert')).toBeInTheDocument();

    within(cellAt(5, 1)).getByRole('button', { name: 'Text note', pressed: true }).focus();
    await user.keyboard('{ArrowDown}');

    expect(cellAt(5, 2)).toBeInTheDocument();
    expect(within(inspector).getByLabelText('Column')).toHaveValue(5);
    expect(within(inspector).getByLabelText('Row')).toHaveValue(2);
    expect(within(inspector).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses a width that would leave the grid, as a resize', async () => {
    const { user, inspector } = await layoutOfTwoWidgets();
    const column = within(inspector).getByLabelText('Column');
    await user.clear(column);
    await user.type(column, '9');
    const width = within(inspector).getByLabelText('Width (columns)');

    await user.clear(width);
    await user.type(width, '12');

    expect(within(inspector).getByRole('alert')).toHaveTextContent(
      "Can't resize: a widget is 2 to 12 columns wide and 2 to 12 rows high, inside the grid.",
    );
  });
});
