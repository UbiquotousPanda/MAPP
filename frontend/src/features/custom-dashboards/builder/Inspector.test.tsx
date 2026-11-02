import { screen } from '@testing-library/react';
import { useReducer } from 'react';
import { describe, expect, it } from 'vitest';
import { mockApi } from '@/testing/mock-api';
import { renderWithProviders } from '@/testing/render';
import { reply } from '@/testing/replies';
import { testUser } from '@/testing/fixtures/users';
import { dashboard } from './builder-fixtures';
import { builderReducer, initialState, selectedWidget } from './builder-reducer';
import type { BuilderState } from './builder-reducer';
import { Inspector } from './Inspector';

let latest: BuilderState | null = null;

function Harness() {
  const [state, dispatch] = useReducer(builderReducer, dashboard(), (start) => ({
    ...initialState(start),
    selectedId: 'w1',
  }));
  latest = state;
  return (
    <Inspector
      draft={state.draft}
      selected={selectedWidget(state)}
      problems={[]}
      onAction={dispatch}
    />
  );
}

function renderInspector() {
  mockApi([reply('GET /api/v1/data-sources', { body: { items: [] } })]);
  return renderWithProviders(<Harness />, { user: testUser() });
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
