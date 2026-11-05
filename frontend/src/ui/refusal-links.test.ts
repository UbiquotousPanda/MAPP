import { describe, expect, it } from 'vitest';
import { problemText, refusalLinks } from './refusal-links';

describe('032 D-404: the problems of a refusal as links', () => {
  it.each([
    ['ownerId', 'Choose a person.', 'Owner: Choose a person.'],
    ['moaApproverId', 'MoA approver — needed to submit', 'MoA approver — needed to submit'],
    [
      'lines[1].amount',
      'Enter an amount above 0.00 with at most two decimals.',
      'Line 2: Enter an amount above 0.00 with at most two decimals.',
    ],
    ['lines[0].deliveryDate', 'Enter a date.', 'Line 1 · Delivery date: Enter a date.'],
    ['attributes.SA-1050', "'Lubes DE' is inactive.", "'Lubes DE' is inactive."],
  ])('names where %s is when the message does not', (field, message, text) => {
    expect(problemText(field, message)).toBe(text);
  });

  it('lists the field problems first, then the gates by record, each with where to fix it', () => {
    const links = refusalLinks('PR-1002', {
      fields: [{ field: 'ownerId', message: 'Choose a person.' }],
      missing: [
        {
          record: { type: 'activity', id: 'A-1003', name: 'Billboard winter wave' },
          fields: [{ field: '', label: 'Status', reason: 'Must be approved first.' }],
        },
      ],
    });

    expect(links.map((link) => [link.text, link.href])).toEqual([
      ['Owner: Choose a person.', '/purchase-requests/PR-1002/edit?field=ownerId'],
      ['Billboard winter wave: Must be approved first.', '/activities/A-1003'],
    ]);
  });
});
