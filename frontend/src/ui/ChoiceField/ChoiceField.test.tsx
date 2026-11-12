import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/testing/axe';
import { renderWithProviders } from '@/testing/render';
import { ChoiceField } from './ChoiceField';
import type { ChoiceOption } from './ChoiceField';

function optionsOf(count: number, label = (index: number) => `Option ${index + 1}`) {
  return Array.from({ length: count }, (_, index) => ({
    id: `SO-${index + 1}`,
    label: label(index),
    active: true,
  }));
}

function Single({ options, start = '' }: { options: ChoiceOption[]; start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <ChoiceField
        label="Channel"
        name="channel"
        options={options}
        value={value}
        onChange={setValue}
      />
      <p>chosen: {value}</p>
    </>
  );
}

function Multiple({ options, start = [] }: { options: ChoiceOption[]; start?: string[] }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <ChoiceField
        label="Brands"
        name="brands"
        marking="Needed to publish"
        multiple
        options={options}
        value={value}
        onChange={setValue}
      />
      <p>chosen: {value.join(',')}</p>
    </>
  );
}

describe('ChoiceField', () => {
  it('is the app\'s select starting with "Choose…" for up to 10 options (FR-024)', async () => {
    const { user } = renderWithProviders(<Single options={optionsOf(10)} />);
    const select = screen.getByRole('combobox', { name: 'Channel' });
    expect(select).toHaveTextContent('Choose…');

    await user.click(select);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Choose…');
    expect(options).toHaveLength(11);
    await user.click(screen.getByRole('option', { name: 'Option 3' }));

    expect(screen.getByText('chosen: SO-3')).toBeInTheDocument();
    expect(select).toHaveTextContent('Option 3');
    await expectNoAxeViolations();
  });

  it('lists grouped options under their headings at any length, and type-ahead picks one', async () => {
    const options = [
      ...optionsOf(8).map((option) => ({ ...option, group: 'SP&A One data' })),
      ...optionsOf(4, (index) => `Upload ${index + 1}`).map((option, index) => ({
        ...option,
        id: `UP-${index + 1}`,
        group: 'Uploaded data',
      })),
    ];
    const { user } = renderWithProviders(<Single options={options} />);
    const select = screen.getByRole('combobox', { name: 'Channel' });

    await user.click(select);
    const uploaded = screen.getByRole('group', { name: 'Uploaded data' });
    expect(within(uploaded).getAllByRole('option')).toHaveLength(4);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    select.focus();
    await user.keyboard('U');

    expect(screen.getByText('chosen: UP-1')).toBeInTheDocument();
  });

  it('sends its value with the form and saves it on Enter while closed (038 FR-047)', async () => {
    const saved: string[] = [];
    const { user } = renderWithProviders(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saved.push(String(new FormData(event.currentTarget).get('channel')));
        }}
      >
        <Single options={optionsOf(3)} start="SO-2" />
      </form>,
    );

    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Channel' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(saved).toEqual(['SO-2']);
  });

  it('is a group of check boxes for a multiple choice of up to 10 options', async () => {
    const { user } = renderWithProviders(<Multiple options={optionsOf(3)} />);

    const group = screen.getByRole('group', { name: 'Brands Needed to publish' });
    await user.click(within(group).getByRole('checkbox', { name: 'Option 1' }));
    await user.click(within(group).getByRole('checkbox', { name: 'Option 3' }));
    await user.click(within(group).getByRole('checkbox', { name: 'Option 1' }));

    expect(screen.getByText('chosen: SO-3')).toBeInTheDocument();
  });

  it('becomes searchable above 10 options (design system §5)', () => {
    renderWithProviders(<Single options={optionsOf(11)} />);

    const field = screen.getByRole('combobox', { name: 'Channel' });
    expect(field.tagName).toBe('INPUT');
    expect(field).toHaveAttribute('placeholder', 'Type to search');
  });

  it('finds "0220" among 1,217 options and lists at most 50 (SC-007)', async () => {
    const options = optionsOf(1217, (index) => `CC-${String(index).padStart(4, '0')}`);
    const { user } = renderWithProviders(<Single options={options} />);
    const field = screen.getByRole('combobox', { name: 'Channel' });

    await user.click(field);
    expect(screen.getAllByRole('option')).toHaveLength(50);
    expect(
      screen.getByText('Showing 50 of 1,217 — keep typing to narrow down.'),
    ).toBeInTheDocument();

    await user.type(field, '0220');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['CC-0220']);

    await user.keyboard('{Enter}');
    expect(screen.getByText('chosen: SO-221')).toBeInTheDocument();
    expect(screen.getByText('CC-0220')).toBeInTheDocument();
  });

  it('says when no option matches', async () => {
    const { user } = renderWithProviders(<Single options={optionsOf(20)} />);

    await user.type(screen.getByRole('combobox', { name: 'Channel' }), 'zzz');

    expect(screen.getByText("No option matches 'zzz'.")).toBeInTheDocument();
  });

  it('offers an inactive option only while it is chosen, labelled "(inactive)" (FR-004)', async () => {
    const options = [
      { id: 'SO-1', label: 'TV', active: true },
      { id: 'SO-2', label: 'Radio', active: false },
      { id: 'SO-3', label: 'Print', active: false },
    ];
    const { user } = renderWithProviders(<Single options={options} start="SO-2" />);

    const select = screen.getByRole('combobox', { name: 'Channel' });
    expect(select).toHaveTextContent('Radio (inactive)');

    await user.click(select);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose…',
      'TV',
      'Radio (inactive)',
    ]);
    await user.click(screen.getByRole('option', { name: 'TV' }));
    await user.click(select);
    expect(screen.queryByRole('option', { name: 'Radio (inactive)' })).not.toBeInTheDocument();
  });

  it('is locked with its reason under it', () => {
    renderWithProviders(
      <ChoiceField
        label="Region"
        name="region"
        options={optionsOf(3)}
        value=""
        onChange={() => {}}
        disabledReason="Choose a cluster first."
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Region' });
    expect(select).toBeDisabled();
    expect(select).toHaveAccessibleDescription('Choose a cluster first.');
  });
});
