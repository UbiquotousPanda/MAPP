import { useAddressParams } from '@/ui/useAddressParams';
import { FRAME_PARAMS, readAddress, writeAddress } from './report-address';
import type { ReportAddress } from './report-address';

export type AddressUpdate = ReportAddress | ((latest: ReportAddress) => ReportAddress);

/** A report's own parameters are kept after the frame's; written in place, so Back leaves the report. */
export function useReportAddress(): [ReportAddress, (next: AddressUpdate) => void] {
  const [params, setParams] = useAddressParams();
  const write = (update: AddressUpdate) =>
    setParams(
      (latest) => {
        const before = readAddress(latest);
        const next = typeof update === 'function' ? update(before) : update;
        const written = writeAddress(next);
        const keepsPage = onlyTablesChanged(before, next);
        for (const [name, value] of latest) {
          if (!FRAME_PARAMS.includes(name) && (keepsPage || name !== 'page')) {
            written.append(name, value);
          }
        }
        return written;
      },
      { replace: true },
    );
  return [readAddress(params), write];
}

function onlyTablesChanged(before: ReportAddress, after: ReportAddress): boolean {
  const rows = (address: ReportAddress) => writeAddress({ ...address, tables: [] }).toString();
  return rows(before) === rows(after);
}
