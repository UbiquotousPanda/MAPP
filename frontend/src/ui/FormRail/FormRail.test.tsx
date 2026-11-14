import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FormCard, FormLayout } from './FormRail';

const SECTIONS = [
  { id: 'basics', title: 'Basics', needed: 2, missing: 1 },
  { id: 'budget', title: 'Budget', needed: 1, missing: 0 },
  { id: 'goals', title: 'Goals', needed: 0, missing: 0 },
];

function renderForm() {
  render(
    <FormLayout sections={SECTIONS} extra={<p>Activity summary</p>}>
      {SECTIONS.map((section) => (
        <FormCard key={section.id} id={section.id} title={section.title}>
          <label>
            {section.title} field
            <input />
          </label>
        </FormCard>
      ))}
    </FormLayout>,
  );
  return screen.getByRole('navigation', { name: 'On this page' });
}

describe('SectionBar', () => {
  it('038 P-04: links each section with the needed fields it still lacks, and the overall count', () => {
    const bar = renderForm();

    expect(within(bar).getByRole('link', { name: 'Basics 1 needed' })).toHaveAttribute(
      'href',
      '#basics',
    );
    expect(within(bar).getByRole('link', { name: 'Budget all filled in' })).toBeVisible();
    expect(within(bar).getByRole('link', { name: 'Goals' })).toBeVisible();
    expect(bar).toHaveTextContent('2 of 3 needed fields filled');
    expect(screen.getByText('Activity summary')).toBeVisible();
  });

  it('038 P-04: a section link moves the focus to that section’s first field', async () => {
    const bar = renderForm();

    await userEvent.click(within(bar).getByRole('link', { name: /^Budget/ }));

    expect(screen.getByRole('textbox', { name: 'Budget field' })).toHaveFocus();
  });
});
