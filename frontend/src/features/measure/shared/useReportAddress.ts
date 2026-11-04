import { useSearchParams } from 'react-router';
import { FRAME_PARAMS, readAddress, writeAddress } from './report-address';
import type { ReportAddress } from './report-address';

/** Canonical address; a report's own parameters (a tab, a sort) are kept after the frame's. */
export function useReportAddress(): [ReportAddress, (next: ReportAddress) => void] {
  const [params, setParams] = useSearchParams();
  const current = readAddress(params);
  const write = (next: ReportAddress) => {
    const written = writeAddress(next);
    const keepsPage = onlyTablesChanged(current, next);
    for (const [name, value] of params) {
      if (!FRAME_PARAMS.includes(name) && (keepsPage || name !== 'page')) {
        written.append(name, value);
      }
    }
    setParams(written);
  };
  return [current, write];
}

function onlyTablesChanged(before: ReportAddress, after: ReportAddress): boolean {
  const rows = (address: ReportAddress) => writeAddress({ ...address, tables: [] }).toString();
  return rows(before) === rows(after);
}
