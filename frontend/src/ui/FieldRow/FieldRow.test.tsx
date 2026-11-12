import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FieldRow } from './FieldRow';

describe('FieldRow', () => {
  it('keeps a pair of fields in reading order, each named by its own label (design system §2.4 C)', async () => {
    render(
      <FieldRow>
        <label>
          Plan currency
          <input />
        </label>
        <label>
          Plan budget
          <input />
        </label>
      </FieldRow>,
    );

    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Plan currency' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'Plan budget' })).toHaveFocus();
  });
});
