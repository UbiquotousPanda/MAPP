import { FormDialog } from '@/ui/FormDialog/FormDialog';
import type { PurchaseRequestLineItemOption } from './api';
import { ADD_LINE, PICKER } from './form-text';
import { LineItemOptionsList } from './LineItemOptionsList';
import type { LineItemOptionsListProps } from './LineItemOptionsList';

export interface LineItemPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: LineItemOptionsListProps['query'];
  inForm: string[];
  onChoose: (option: PurchaseRequestLineItemOption) => void;
}

/** Add line (032 FR-010): the line-item search in a dialog; Escape or Close leaves it. */
export function LineItemPicker({
  open,
  onOpenChange,
  query,
  inForm,
  onChoose,
}: LineItemPickerProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={PICKER.title}
      description={PICKER.description}
      cancelLabel={PICKER.close}
      size="lg"
    >
      {open && (
        <LineItemOptionsList
          query={query}
          inForm={inForm}
          action={ADD_LINE}
          onChoose={(option) => {
            onChoose(option);
            onOpenChange(false);
          }}
        />
      )}
    </FormDialog>
  );
}
