import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyForm, LUBRICANTS, MEDIA_CHANNEL, PIR } from '@/testing/fixtures/shell-attributes';
import { offered, renderAttributeEditor } from '@/testing/fixtures/shell-attribute-pages';
import { choose } from '@/testing/select';
import { reply } from '@/testing/replies';

describe('ShellAttributeEditorPage: depends on and condition (US3, FR-022, FR-023)', () => {
  it('links each option of a dependent attribute, listing every unlinked one at once (US3-2)', async () => {
    const { user, api, router } = renderAttributeEditor(
      '/settings/shell-attributes/new?level=activity',
      [
        reply('POST /api/v1/shell-attributes', {
          status: 201,
          body: { ...MEDIA_CHANNEL, id: 'SA-1020', label: 'Spot type' },
        }),
      ],
    );

    await user.type(await screen.findByRole('textbox', { name: /^Label/ }), 'Spot type');
    await choose(user, screen.getByRole('combobox', { name: /Type/ }), 'Single choice');
    const dependsOn = await screen.findByRole('combobox', { name: /Depends on/ });
    // Only single and multiple choice attributes placed before it (not the % split Brands).
    expect(await offered(user, /^Depends on/)).toEqual(['None', 'Media channel', 'PIR']);
    expect(dependsOn).toHaveTextContent('None');
    await user.click(screen.getByRole('button', { name: 'About Depends on' }));
    expect(screen.getByRole('dialog', { name: 'About Depends on' })).toHaveTextContent(
      'Its options are filtered by the value chosen for that attribute.',
    );
    await choose(user, dependsOn, 'Media channel');
    for (const label of ['TV spot', 'Radio spot']) {
      await user.click(screen.getByRole('button', { name: 'Add option' }));
      await waitFor(() =>
        expect(screen.getAllByRole('textbox', { name: /^Option/ }).at(-1)).toHaveFocus(),
      );
      await user.keyboard(label);
    }
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('2 problems need your attention')).toBeInTheDocument();
    expect(
      screen.getAllByText("Link 'TV spot' to at least one media channel option."),
    ).toHaveLength(2);
    expect(
      screen.getAllByText("Link 'Radio spot' to at least one media channel option."),
    ).toHaveLength(2);
    expect(api.bodiesOf('POST /api/v1/shell-attributes')).toEqual([]);

    const first = screen.getByRole('group', { name: 'Option 1' });
    await user.click(within(first).getByRole('button', { name: 'About Linked to' }));
    expect(screen.getByRole('dialog', { name: 'About Linked to' })).toHaveTextContent(
      'Shown when one of these media channel options is chosen.',
    );
    // An inactive parent option can't be newly linked.
    expect(within(first).queryByRole('checkbox', { name: /Print/ })).not.toBeInTheDocument();
    await user.click(within(first).getByRole('checkbox', { name: 'TV' }));
    const second = screen.getByRole('group', { name: 'Option 2' });
    await user.click(within(second).getByRole('checkbox', { name: 'Radio' }));
    await user.click(within(second).getByRole('checkbox', { name: 'Online' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/settings/shell-attributes/SA-1020'),
    );
    expect(api.bodiesOf('POST /api/v1/shell-attributes')).toEqual([
      {
        label: 'Spot type',
        helpText: '',
        level: 'activity',
        type: 'singleChoice',
        marking: 'optional',
        section: 'Shell attributes',
        parentAttributeId: 'SA-1010',
        conditionOptionIds: [],
        options: [
          { label: 'TV spot', parentOptionIds: ['SO-1101'] },
          { label: 'Radio spot', parentOptionIds: ['SO-1102', 'SO-1104'] },
        ],
      },
    ]);
  });

  it('shows an attribute only for chosen business units (FR-023)', async () => {
    const { user, api } = renderAttributeEditor('/settings/shell-attributes/new?level=activity', [
      reply('POST /api/v1/shell-attributes', { status: 201, body: { ...PIR, id: 'SA-1021' } }),
    ]);

    await user.type(await screen.findByRole('textbox', { name: /^Label/ }), 'Lubricants code');
    await choose(user, screen.getByRole('combobox', { name: /Type/ }), 'Text');
    const condition = await screen.findByRole('group', {
      name: /Shown when the plan's business unit includes/,
    });
    const about = "About Shown when the plan's business unit includes";
    await user.click(within(condition).getByRole('button', { name: about }));
    expect(screen.getByRole('dialog', { name: about })).toHaveTextContent(
      'Leave all unticked to show it always.',
    );
    // Only choice attributes depend on others.
    expect(screen.queryByRole('combobox', { name: /Depends on/ })).not.toBeInTheDocument();
    await user.click(within(condition).getByRole('checkbox', { name: 'Lubricants' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.bodiesOf('POST /api/v1/shell-attributes')).toHaveLength(1));
    expect(api.bodiesOf('POST /api/v1/shell-attributes')[0]).toMatchObject({
      type: 'text',
      parentAttributeId: '',
      conditionOptionIds: [LUBRICANTS],
      options: [],
    });
  });

  it('says why no condition can be set while there is no Business unit attribute', async () => {
    const { user } = renderAttributeEditor('/settings/shell-attributes/new?level=plan', [
      reply(
        'GET /api/v1/shell-attribute-forms/{level}',
        {
          body: { ...emptyForm('plan'), businessUnitAttributeId: null, businessUnitOptions: [] },
        },
        { level: 'plan' },
      ),
    ]);

    const lock = "Why Shown when the plan's business unit includes can't change";
    await user.click(await screen.findByRole('button', { name: lock }));
    expect(screen.getByRole('dialog', { name: lock })).toHaveTextContent(
      "There is no Business unit attribute yet, so conditions can't be set.",
    );
    expect(
      screen.queryByRole('group', { name: /Shown when the plan's business unit includes/ }),
    ).not.toBeInTheDocument();
  });

  it('links every active option when an attribute starts depending on another (FR-022)', async () => {
    const { user, api, router } = renderAttributeEditor('/settings/shell-attributes/SA-1011/edit', [
      reply(
        'GET /api/v1/shell-attributes/{attributeId}',
        { body: PIR },
        { attributeId: 'SA-1011' },
      ),
      reply(
        'PATCH /api/v1/shell-attributes/{attributeId}',
        {
          body: { ...PIR, parentAttribute: { id: 'SA-1010', name: 'Media channel', active: true } },
        },
        { attributeId: 'SA-1011' },
      ),
    ]);

    const dependsOn = await screen.findByRole('combobox', { name: /Depends on/ });
    // PIR keeps its place, after Media channel only.
    expect(await offered(user, /^Depends on/)).toEqual(['None', 'Media channel']);
    await choose(user, dependsOn, 'Media channel');
    const yes = await screen.findByRole('group', { name: 'Yes' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('2 problems need your attention')).toBeInTheDocument();
    expect(screen.getAllByText("Link 'Yes' to at least one media channel option.")).toHaveLength(2);
    expect(screen.getAllByText("Link 'No' to at least one media channel option.")).toHaveLength(2);
    await user.click(within(yes).getByRole('checkbox', { name: 'TV' }));
    await user.click(
      within(screen.getByRole('group', { name: 'No' })).getByRole('checkbox', { name: 'Radio' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/settings/shell-attributes/SA-1011'),
    );
    expect(api.bodiesOf('PATCH /api/v1/shell-attributes/SA-1011')).toEqual([
      {
        parentAttributeId: 'SA-1010',
        optionLinks: [
          { optionId: 'SO-1201', parentOptionIds: ['SO-1101'] },
          { optionId: 'SO-1202', parentOptionIds: ['SO-1102'] },
        ],
        version: 1,
      },
    ]);
  });

  it('removes a dependency and a condition, sending only those changes', async () => {
    const region = {
      ...PIR,
      parentAttribute: { id: 'SA-1010', name: 'Media channel', active: true },
      condition: [{ id: LUBRICANTS, name: 'Lubricants', active: true }],
    };
    const { user, api } = renderAttributeEditor('/settings/shell-attributes/SA-1011/edit', [
      reply(
        'GET /api/v1/shell-attributes/{attributeId}',
        { body: region },
        { attributeId: 'SA-1011' },
      ),
      reply(
        'PATCH /api/v1/shell-attributes/{attributeId}',
        { body: PIR },
        { attributeId: 'SA-1011' },
      ),
    ]);

    const dependsOn = await screen.findByRole('combobox', { name: /Depends on/ });
    expect(dependsOn).toHaveTextContent('Media channel');
    await choose(user, dependsOn, 'None');
    const condition = screen.getByRole('group', {
      name: /Shown when the plan's business unit includes/,
    });
    expect(within(condition).getByRole('checkbox', { name: 'Lubricants' })).toBeChecked();
    await user.click(within(condition).getByRole('checkbox', { name: 'Lubricants' }));
    // No new parent: no option links to fill in.
    expect(screen.queryByRole('group', { name: 'Yes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.bodiesOf('PATCH /api/v1/shell-attributes/SA-1011')).toEqual([
        { parentAttributeId: '', conditionOptionIds: [], version: 1 },
      ]),
    );
  });
});
