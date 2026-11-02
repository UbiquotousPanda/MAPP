import { screen } from '@testing-library/react';
import { useEffect, useReducer } from 'react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { testUser } from '@/testing/fixtures/users';
import type { CustomDashboard, Widget, WidgetQuery } from '../model';
import { BAR_QUERY, BAR_WIDGET, dashboard, SOURCES } from './builder-fixtures';
import { builderReducer, initialState, selectedWidget } from './builder-reducer';
import type { BuilderState } from './builder-reducer';
import { Inspector } from './Inspector';

let latest: BuilderState | null = null;

function Harness({ start }: { start: CustomDashboard }) {
  const [state, dispatch] = useReducer(builderReducer, start, (start) => ({
    ...initialState(start),
    selectedId: 'w1',
  }));
  useEffect(() => {
    latest = state;
  }, [state]);
  return (
    <Inspector
      draft={state.draft}
      selected={selectedWidget(state)}
      problems={[]}
      onAction={dispatch}
    />
  );
}

function renderInspector(start = dashboard()) {
  mockApi([reply('GET /api/v1/data-sources', { body: { items: SOURCES } })]);
  return renderWithProviders(<Harness start={start} />, { user: testUser() });
}

const THREE_MEASURES: WidgetQuery = {
  ...BAR_QUERY,
  measures: [
    { aggregation: 'count', field: null, label: 'Records' },
    { aggregation: 'sum', field: 'plannedCost', label: 'Planned' },
    { aggregation: 'max', field: 'plannedCost', label: 'Largest' },
  ],
  sort: { by: 'measure', measureIndex: 2, direction: 'desc' },
};

function withWidget(widget: Partial<Widget>): CustomDashboard {
  return dashboard({ widgets: [{ ...BAR_WIDGET, query: THREE_MEASURES, ...widget }] });
}

describe('051 FR-028: the Layout tab places the widget by column, row, width and height', () => {
  it('keeps the focus in the field while a number of several digits is typed', async () => {
    const { user } = renderInspector();
    await user.click(screen.getByRole('tab', { name: 'Layout' }));

    const row = screen.getByRole('spinbutton', { name: 'Row' });
    await user.tripleClick(row);
    await user.keyboard('12');

    expect(latest?.draft.widgets[0]?.layout).toEqual({ x: 0, y: 11, w: 6, h: 4 });
    expect(screen.getByRole('spinbutton', { name: 'Row' })).toHaveFocus();
    expect(screen.getByRole('spinbutton', { name: 'Row' })).toHaveValue(12);
  });
});

describe('051 FR-025, FR-031: removing a measure keeps the options of the measures that stay', () => {
  it('keeps each remaining measure of a bar and line its own bars-or-line and axis, and the sort', async () => {
    const { user } = renderInspector(
      withWidget({
        type: 'combo',
        display: {
          measureStyles: [
            { as: 'bar', axis: 'left' },
            { as: 'line', axis: 'right' },
            { as: 'bar', axis: 'right' },
          ],
        },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Remove measure 1' }));

    const widget = latest?.draft.widgets[0];
    expect(widget?.query?.measures.map((measure) => measure.label)).toEqual(['Planned', 'Largest']);
    expect(widget?.display.measureStyles).toEqual([
      { as: 'line', axis: 'right' },
      { as: 'bar', axis: 'right' },
    ]);
    expect(widget?.query?.sort).toEqual({ by: 'measure', measureIndex: 1, direction: 'desc' });
  });

  it("keeps a table's chosen columns on the same measures", async () => {
    const { user } = renderInspector(
      withWidget({
        type: 'table',
        display: { table: { columns: ['dimension', 'm2'], totals: true } },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Remove measure 2' }));

    expect(latest?.draft.widgets[0]?.display.table).toEqual({
      columns: ['dimension', 'm1'],
      totals: true,
    });
  });

  it('shows a measure added to a table whose columns were chosen', async () => {
    const { user } = renderInspector(
      withWidget({
        type: 'table',
        display: { table: { columns: ['dimension', 'm2'], totals: false } },
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Add measure' }));

    expect(latest?.draft.widgets[0]?.display.table?.columns).toEqual(['dimension', 'm2', 'm3']);
  });
});
