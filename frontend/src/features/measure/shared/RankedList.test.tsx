import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSearchParams } from 'react-router';
import type { components } from '@/api/generated/schema';
import { expectNoAxeViolations } from '@/testing/axe';
import { htmlElement } from '@/testing/dom';
import { planBudgetRanked } from '@/testing/fixtures/plan-budget';
import { testUser } from '@/testing/fixtures/users';
import { renderWithProviders } from '@/testing/render';
import { choose } from '@/testing/select';
import { RankedList } from './RankedList';
import type { RankedColumn, RankedData } from './RankedList';

type Figures = components['schemas']['PlanBudgetFigures'];

const BUDGET: RankedColumn<Figures> = {
  key: 'budget',
  label: 'Budget',
  value: (f) => f.budget?.amount ?? '—',
};
const PLANNED: RankedColumn<Figures> = {
  key: 'planned',
  label: 'Planned cost',
  value: (f) => f.planned?.amount ?? '—',
};
const COLUMNS = [BUDGET, PLANNED];

function List({ data, columns }: { data: RankedData<Figures>; columns: RankedColumn<Figures>[] }) {
  return (
    <RankedList
      report="budget"
      data={data}
      error={null}
      onRetry={() => {}}
      columns={columns}
      groups={[
        { value: 'none', label: 'None' },
        { value: 'owner', label: 'Owner' },
      ]}
      defaultSort="planned"
      flag={(f) => (f.overAllocated ? 'Over-allocated' : undefined)}
      caption="Figures in US dollars"
    />
  );
}

function renderList(
  data: RankedData<Figures> = planBudgetRanked(),
  route = '/reports/budget',
  columns = COLUMNS,
) {
  return renderWithProviders(<List data={data} columns={columns} />, {
    route,
    user: testUser(),
    path: '/reports/budget',
  });
}

const DRILLED = planBudgetRanked({
  trail: [
    { id: 'P-1001', level: 'plan', name: 'FY2026 Lubricants' },
    { id: 'C-1001', level: 'campaign', name: 'Helix launch' },
    { id: 'I-1001', level: 'initiative', name: 'Launch events' },
  ],
});

/** Answers like the API: the drilled list once the address asks for a drill. */
function DrillingList() {
  const [params] = useSearchParams();
  return <List data={params.get('drill') ? DRILLED : planBudgetRanked()} columns={COLUMNS} />;
}

const search = (router: { state: { location: { search: string } } }) =>
  new URLSearchParams(router.state.location.search);

describe('RankedList (040 US2, US3)', () => {
  it('lists each top entry with its children, marks the sorted column and over-allocation (FR-008, FR-009, FR-012)', async () => {
    renderList();

    const rows = screen.getAllByRole('row').map((row) => row.textContent);
    expect(rows[1]).toMatch(/^Helix launch/);
    expect(rows[2]).toMatch(/^Launch events/);
    expect(screen.getByRole('link', { name: 'Open Helix launch in Plan' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Planned cost' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    const fleet = screen.getByRole('rowheader', { name: /^Rimula fleet/ });
    expect(within(fleet).getByText('Over-allocated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Helix launch in Plan' })).toHaveAttribute(
      'href',
      '/plans/P-1001/campaigns/C-1001',
    );
    await expectNoAxeViolations();
  });

  it('keeps sort, group and page in the address, a change starting again at page 1 (FR-013, FR-014)', async () => {
    const { user, router } = renderList(
      planBudgetRanked({ total: 120 }),
      '/reports/budget?year=2026',
    );

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(search(router).get('page')).toBe('2');
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    await choose(user, screen.getByRole('combobox', { name: 'Group by' }), 'Owner');

    const params = search(router);
    expect([
      params.get('sort'),
      params.get('group'),
      params.get('page'),
      params.get('year'),
    ]).toEqual(['budget', 'owner', null, '2026']);
  });

  it('sorts by a column only when it is sortable, and still shows it (FR-013, 049 FR-006)', () => {
    renderList(planBudgetRanked(), '/reports/budget', [{ ...BUDGET, sortable: false }, PLANNED]);

    const budget = screen.getByRole('columnheader', { name: 'Budget' });
    expect(within(budget).queryByRole('button')).not.toBeInTheDocument();
    const planned = screen.getByRole('columnheader', { name: 'Planned cost' });
    expect(within(planned).getByRole('button', { name: 'Planned cost' })).toBeInTheDocument();
  });

  it('sorts high to low first, and the sorted column again flips the order (FR-013)', async () => {
    const { user, router } = renderList(planBudgetRanked(), '/reports/budget');

    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect([search(router).get('sort'), search(router).get('order')]).toEqual(['budget', null]);
    await user.click(screen.getByRole('button', { name: 'Budget' }));
    expect(search(router).get('order')).toBe('asc');
    expect(screen.getByRole('columnheader', { name: 'Budget' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('reaches page 50, whose number is also the default page size (FR-014, D-432)', async () => {
    const { user, router } = renderList(
      planBudgetRanked({ total: 2550 }),
      '/reports/budget?page=49',
    );

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(search(router).get('page')).toBe('50');
  });

  it('opens a child as the new top with a trail, and Back goes up one level (FR-010)', async () => {
    const { user, router } = renderList(DRILLED);

    await user.click(screen.getByRole('button', { name: 'Launch events' }));
    expect(search(router).get('drill')).toBe('I-1001');
    const trail = screen.getByRole('navigation', { name: 'Drill trail' });
    expect(within(trail).getByText('Launch events')).toHaveAttribute('aria-current', 'location');

    await user.click(within(trail).getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(search(router).get('drill')).toBe('C-1001'));
  });

  it('says when the opened record is no longer in view (FR-010)', () => {
    renderList(planBudgetRanked({ drillLost: true }));

    expect(screen.getByText(/no longer in view/)).toBeInTheDocument();
  });

  it("moves the focus to the trail's current step after a drill, not to the page (FR-010)", async () => {
    const { user } = renderWithProviders(<DrillingList />, {
      route: '/reports/budget',
      user: testUser(),
      path: '/reports/budget',
    });

    await user.click(screen.getByRole('button', { name: 'Launch events' }));

    const trail = await screen.findByRole('navigation', { name: 'Drill trail' });
    await waitFor(() => expect(within(trail).getByText('Launch events')).toHaveFocus());
  });

  it('says which entries are shown and pages through them, 50 at a time when the address names an old size (FR-014, D-432)', async () => {
    const { user } = renderList(planBudgetRanked({ total: 120 }), '/reports/budget?page=2&size=10');

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByText('51–100 of 120')).toBeInTheDocument();
    expect(within(pages).getByRole('combobox', { name: 'Rows per page' })).toBeInTheDocument();
    await user.click(within(pages).getByRole('button', { name: 'Previous page' }));
    expect(within(pages).getByText('1–50 of 120')).toBeInTheDocument();
  });

  it('offers no page buttons when everything fits on one page (FR-014)', () => {
    renderList();

    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByText('1–2 of 2')).toBeInTheDocument();
    expect(within(pages).queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('shows the caption once above the table (050 FR-008)', () => {
    renderList();

    expect(screen.getAllByText('Figures in US dollars')).toHaveLength(1);
  });

  it("ends with the API's Total row over every page, not the page's sum (039 FR-035)", () => {
    const totals = {
      ...planBudgetRanked().totals,
      planned: { amount: '12345.00', currency: 'USD' },
    };
    renderList(planBudgetRanked({ total: 30, totals }));

    const rows = screen.getAllByRole('row');
    const total = htmlElement(rows.at(-1), 'the last row');
    expect(total.closest('tfoot')).not.toBeNull();
    expect(within(total).getByRole('rowheader', { name: 'Total' })).toBeInTheDocument();
    expect(total.textContent).toContain('12345.00');
  });

  it('shows no Total row when nothing ranks on the page (039 FR-035)', () => {
    renderList(planBudgetRanked({ total: 0, groups: [] }));
    expect(screen.getByText('Nothing to rank on this page.')).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: 'Total' })).not.toBeInTheDocument();
  });
});
