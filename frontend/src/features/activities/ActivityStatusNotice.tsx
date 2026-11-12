import type { ActivityApproval } from '@/features/approvals';
import { declineBoxText, levelOf, names } from '@/features/approvals';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { useFormatters } from '@/format/useFormatters';
import { activityBannerText } from '@/ui/ActivityStatusChip/activity-status';
import type { Activity } from './api';

export interface ActivityStatusNoticeProps {
  activity: Activity;
  /** The activity's approval (feature 008): the latest decline and the waiting level. */
  approval: ActivityApproval | undefined;
}

// Under the header, never buried: a decline with its reason, who a submitted activity waits for,
// and that changing planned cost or dates restarts approval.
export function ActivityStatusNotice({ activity, approval }: ActivityStatusNoticeProps) {
  const { dateFormat } = useFormatters();
  const decline = approval?.latestDecline;

  if (activity.status === 'declined') {
    if (!decline) {
      return null;
    }
    return (
      <InlineAlert tone="danger" title={declineBoxText(decline, dateFormat)}>
        {decline.comment && <p>{decline.comment}</p>}
        <p>
          Change what is needed, then re-submit it for approval.{' '}
          <a href="#approval">See the approval history</a>
        </p>
      </InlineAlert>
    );
  }

  const banner = activityBannerText(activity.displayStatus);
  if (!banner) {
    return null;
  }
  if (activity.status === 'submitted') {
    const round = approval?.rounds[0];
    const level = round?.levels.find((each) => each.number === round.currentLevel);
    return (
      <InlineAlert
        tone="warning"
        title={
          round && level
            ? `Waiting for ${levelOf(round.currentLevel, round.levelCount)}${
                level.approvers.length > 0 ? ` — ${names(level.approvers)}` : ''
              }`
            : undefined
        }
      >
        <p>{banner}</p>
      </InlineAlert>
    );
  }
  return (
    <InlineAlert tone="info">
      <p>{banner}</p>
    </InlineAlert>
  );
}
