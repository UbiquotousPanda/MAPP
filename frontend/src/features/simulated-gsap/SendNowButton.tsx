import { Send } from 'lucide-react';
import { useState } from 'react';
import { InlineError } from '@/ui/InlineError/InlineError';
import { Button } from '@/ui/Button/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { useSendSwbsRequests } from './api';
import { GsapProgress } from './GsapProgress';
import { SEND_NOW, SEND_NOW_TEXT, sendNowTitle } from './simulated-gsap-text';

export interface SendNowButtonProps {
  lineItemId: string;
  lineItemName: string;
}

/** Sends one line item to the simulated GSAP after confirmation; its page then shows the code. */
export function SendNowButton({ lineItemId, lineItemName }: SendNowButtonProps) {
  const send = useSendSwbsRequests();
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    setConfirming(false);
    send.mutate([lineItemId]);
  }

  return (
    <>
      <Button icon={<Send />} disabled={send.isPending} onClick={() => setConfirming(true)}>
        {SEND_NOW}
      </Button>
      {send.isPending && <GsapProgress />}
      {send.error && <InlineError>{send.error.message}</InlineError>}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={sendNowTitle(lineItemName)}
        confirmLabel={SEND_NOW}
        onConfirm={handleConfirm}
        busy={send.isPending}
      >
        <p>{SEND_NOW_TEXT}</p>
      </ConfirmDialog>
    </>
  );
}
