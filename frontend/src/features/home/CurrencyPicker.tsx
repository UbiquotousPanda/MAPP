import { ApiError } from '@/api/errors';
import { Select } from '@/ui/Select/Select';
import { useToast } from '@/ui/Toast/useToast';
import { useDisplayCurrencies } from '@/features/people';
import type { DisplayCurrencyOption } from '@/features/people';
import { useFormatters } from '@/format/useFormatters';
import { useSaveDisplayCurrency } from './api';
import { CHOICE_NOT_SAVED } from './home-text';

// "EUR – Euro" as the reports write it; the chosen one is always offered, also while the list loads.
function currencyOptions(currencies: DisplayCurrencyOption[] | undefined, current: string) {
  const options = (currencies ?? []).map((currency) => ({
    value: currency.code,
    label: `${currency.code} – ${currency.name}`,
  }));
  return options.some((option) => option.value === current)
    ? options
    : [{ value: current, label: current }, ...options];
}

export function CurrencyPicker() {
  const { displayCurrency } = useFormatters();
  const currencies = useDisplayCurrencies();
  const save = useSaveDisplayCurrency();
  const { show } = useToast();
  // The chosen currency shows at once; it goes back to the saved one when the save fails.
  const value = (save.isPending && save.variables) || displayCurrency;

  function choose(code: string) {
    save.mutate(code, {
      onError: (failure) => {
        // A session that has ended is handled by the session alone (001 plan "Session").
        if (
          failure instanceof ApiError &&
          (failure.kind === 'signInRequired' || failure.kind === 'sessionExpired')
        ) {
          return;
        }
        show({
          message: CHOICE_NOT_SAVED,
          action: { label: 'Try again', altText: 'Try again', onClick: () => choose(code) },
        });
      },
    });
  }

  return (
    <Select
      label="Currency"
      value={value}
      options={currencyOptions(currencies.data?.items, value)}
      onChange={choose}
    />
  );
}
