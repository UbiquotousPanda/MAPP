import type { FieldProblem } from '@/ui/FormErrorSummary/FormErrorSummary';
import { problemOf } from '@/ui/FormPanel/problem-of';
import { LockedNote } from '@/ui/LockedNote/LockedNote';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import type { TeamRef } from '@/ui/TeamPill/TeamPill';
import { TeamPicker } from '@/ui/TeamPicker/TeamPicker';
import type { AccessScopeType, Role } from './api';
import { ADMINISTRATOR_SCOPE, SCOPE_WORDS } from './access-words';
import styles from './access.module.css';
import type { RoleDraft } from './role-drafts';

const CHOICES: AccessScopeType[] = ['all', 'myTeams', 'teams'];

export interface ScopeChoiceProps {
  role: Role;
  draft: RoleDraft;
  index: number;
  allTeams: TeamRef[];
  problems: FieldProblem[];
  onChange: (changes: Partial<RoleDraft>) => void;
}

/** Where a ticked role applies: All markets, My teams, or Chosen teams with the team picker. */
export function ScopeChoice({
  role,
  draft,
  index,
  allTeams,
  problems,
  onChange,
}: ScopeChoiceProps) {
  if (role.builtIn === 'administrator') {
    return (
      <div className={styles.scope}>
        <LockedNote>{ADMINISTRATOR_SCOPE}</LockedNote>
      </div>
    );
  }
  return (
    <div className={styles.scope}>
      <RadioGroup
        label={`Where ${role.name} applies`}
        name={`scope-${role.id}`}
        options={CHOICES.map((type) => ({ value: type, label: SCOPE_WORDS[type] }))}
        value={draft.scope}
        onChange={(scope) => onChange({ scope })}
        error={problemOf(problems, `roles.${index}.scope`)}
      >
        {draft.scope === 'teams' && (
          <TeamPicker
            label="Teams"
            name={`roles.${index}.teamIds`}
            teams={allTeams}
            value={draft.teamIds}
            onChange={(teamIds) => onChange({ teamIds })}
            error={problemOf(problems, `roles.${index}.teamIds`)}
          />
        )}
      </RadioGroup>
    </div>
  );
}
