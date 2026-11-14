import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { FieldHelpTip } from '@/features/settings';
import { LinkButton } from '@/ui/Button/Button';
import { LevelTag } from '@/ui/LevelTag/LevelTag';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { PersonLabel } from '@/ui/PersonLabel/PersonLabel';
import { TeamPills } from '@/ui/TeamPill/TeamPill';
import type { ActionsMenuItem } from '@/ui/ActionsMenu/ActionsMenu';
import { useFormatters } from '@/format/useFormatters';
import { allows } from '@/session/gate-action';
import { BusinessUnitText, PlanCompleteness, PlanStatusChip } from './PlanFacts';
import styles from './PlanHeader.module.css';
import type { Plan } from './api';
import { yearDates } from './plan-text';
import { Middots } from './Middots';
import { PLAN_TYPE_LABELS, planTypeOf } from './plan-currency';
import { spaHref } from './spa-link';

export interface PlanHeaderProps {
  plan: Plan;
  statusAction?: ReactNode;
  moreItems: ActionsMenuItem[];
  extraFacts?: ReactNode;
}

export function PlanHeader({ plan, statusAction, moreItems, extraFacts }: PlanHeaderProps) {
  const { dateRange } = useFormatters();
  const navigate = useNavigate();
  const owner = plan.owner;
  const spaView: ActionsMenuItem = {
    label: 'SP&A view',
    onSelect: () => void navigate(spaHref(plan.id)),
  };

  return (
    <PageHeader
      breadcrumb={[{ label: 'Plans', to: '/plans' }, { label: plan.name }]}
      title={plan.name}
      moreActions={[spaView, ...moreItems]}
      actions={
        <>
          {statusAction}
          {allows(plan.access?.edit) && (
            <LinkButton to={`/plans/${encodeURIComponent(plan.id)}/edit`} variant="primary">
              Edit
            </LinkButton>
          )}
        </>
      }
      meta={
        <div className={styles.meta} aria-label="Plan facts" role="group">
          <div className={styles.chips}>
            <LevelTag level="plan" />
            <PlanStatusChip status={plan.status} />
            <FieldHelpTip helpKey="plan.status" label="Status" />
            <span id="completeness" className={styles.anchor}>
              <PlanCompleteness planId={plan.id} completeness={plan.completeness} />
              <FieldHelpTip helpKey="common.completeness" label="Completeness" />
            </span>
          </div>
          <div className={styles.facts}>
            <Middots>
              {[
                <span key="id">{plan.id}</span>,
                <span key="owner" className={styles.fact}>
                  {owner ? <PersonLabel person={owner} /> : 'No owner yet'}
                  {plan.ownerProblem && (
                    <span className={styles.ownerProblem}>
                      <TriangleAlert aria-hidden="true" />
                      {plan.ownerProblem}
                    </span>
                  )}
                </span>,
                <span key="dates">{yearDates(plan.year, dateRange)}</span>,
                <span key="type">{PLAN_TYPE_LABELS[planTypeOf(plan)]}</span>,
                plan.bcpir && <span key="bcpir">BCPIR</span>,
                plan.currency && plan.currency !== 'USD' && (
                  <span key="currency">Planned in {plan.currency}</span>
                ),
                plan.aop && <span key="aop">AOP plan</span>,
                extraFacts,
                plan.teams.length > 0 && <TeamPills key="teams" teams={plan.teams} linked />,
                <BusinessUnitText key="units" units={plan.businessUnit} />,
              ]}
            </Middots>
          </div>
        </div>
      }
    />
  );
}
