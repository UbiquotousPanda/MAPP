import { ApiError } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { Select } from '@/ui/Select/Select';
import { useToast } from '@/ui/Toast/useToast';
import { useDisplayCurrencies, useUpdateDisplayPreferences } from './api';
import type { DisplayCurrencyOption } from './api';

const NOT_SAVED = "Your choice couldn't be saved.";
const NOTE = 'Every page shows its amounts in this currency.';

// The chosen one is always offered, also while the list loads.
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
  const save = useUpdateDisplayPreferences();
  const { show } = useToast();
  // The chosen currency shows at once; it goes back to the saved one when the save fails.
  const value = (save.isPending && save.variables.displayCurrency) || displayCurrency;

  function choose(code: string) {
    save.mutate(
      { displayCurrency: code },
      {
        onError: (failure) => {
          // A session that has ended is handled by the session alone (001 plan "Session").
          if (
            failure instanceof ApiError &&
            (failure.kind === 'signInRequired' || failure.kind === 'sessionExpired')
          ) {
            return;
          }
          show({
            message: NOT_SAVED,
            action: { label: 'Try again', altText: 'Try again', onClick: () => choose(code) },
          });
        },
      },
    );
  }

  return (
    <Select
      label="Display currency"
      hideLabel
      value={value}
      valueText={value}
      note={NOTE}
      options={currencyOptions(currencies.data?.items, value)}
      onChange={choose}
    />
  );
}
