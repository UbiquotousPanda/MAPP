import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { AddTile, Tile, TileList } from './Tile';

function renderTiles(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <TileList>{children}</TileList>
    </MemoryRouter>,
  );
}

describe('Tile', () => {
  it('opens its page from the title, with the arrow, the foot and an aside', async () => {
    renderTiles(
      <Tile
        title="Budget and spend"
        to="/reports/budget"
        accent={1}
        picture={null}
        foot="For planners"
        aside={<button type="button">About</button>}
      >
        <p>Are we on budget?</p>
      </Tile>,
    );

    expect(screen.getByRole('link', { name: 'Budget and spend' })).toHaveAttribute(
      'href',
      '/reports/budget',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Budget and spend' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Are we on budget?For planners');
    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it('shows its status instead of a link when it cannot be opened', () => {
    renderTiles(
      <Tile
        title="Purchasing"
        accent={1}
        picture={null}
        headingLevel={3}
        status={<span>Coming soon</span>}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Purchasing' })).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('offers a start where a list has nothing yet', () => {
    renderTiles(<AddTile to="/builder" title="New dashboard" text="Pick charts." />);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toHaveAttribute('href', '/builder');
    expect(screen.getByText('Pick charts.')).toBeInTheDocument();
  });
});
