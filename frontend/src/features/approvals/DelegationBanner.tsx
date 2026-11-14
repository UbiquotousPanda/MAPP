import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { useCurrentUser } from '@/session/useSession';
import { useFormatters } from '@/format/useFormatters';
import { useDelegations } from './delegations-api';

/** Today's delegations for or by the signed-in person; nothing while loading or failed (the panel says so). */
export function DelegationBanner() {
  const user = useCurrentUser();
  const { date } = useFormatters();
  const delegations = useDelegations('mine');
  const lines = (delegations.data?.items ?? [])
    .filter((delegation) => delegation.state === 'current')
    .flatMap((delegation) => {
      const until = date(delegation.endDate);
      if (delegation.delegate.id === user.id) {
        return [`You are approving for ${delegation.person.name} until ${until}.`];
      }
      if (delegation.person.id === user.id) {
        return [`${delegation.delegate.name} approves for you until ${until}.`];
      }
      return [];
    });

  if (lines.length === 0) {
    return null;
  }
  return (
    <InlineAlert tone="info">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </InlineAlert>
  );
}
