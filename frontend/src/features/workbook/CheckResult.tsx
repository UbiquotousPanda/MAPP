import { Download } from 'lucide-react';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import dataTable from '@/ui/Table/Table.module.css';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import type { ImportCheck, ImportProblem } from './api';
import { downloadProblems } from './files';
import styles from './workbook.module.css';
import { LEVEL_PLURALS, changeSummary, checkSummary } from './workbook-text';

/** What an import would do per level, and every problem of every row at once (FR-031 – FR-033). */
export function CheckResult({ check }: { check: ImportCheck }) {
  return (
    <div aria-live="polite">
      <p className={styles.summary}>{checkSummary(check)}</p>
      <p className={styles.text}>{changeSummary(check)}</p>
      {/* A scrolling region the keyboard can reach. */}
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="What the import does, scrolls sideways"
        tabIndex={0}
      >
        <table className={cx(dataTable.table, styles.table)}>
          <caption className="visually-hidden">What the import does per level</caption>
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col" className={dataTable.numeric}>
                To create
              </th>
              <th scope="col" className={dataTable.numeric}>
                To update
              </th>
              <th scope="col" className={dataTable.numeric}>
                Unchanged
              </th>
              <th scope="col" className={dataTable.numeric}>
                Left out
              </th>
            </tr>
          </thead>
          <tbody>
            {check.levels.map((l) => (
              <tr key={l.level}>
                <th scope="row">{LEVEL_PLURALS[l.level]}</th>
                <td className={dataTable.numeric}>{l.create}</td>
                <td className={dataTable.numeric}>{l.update}</td>
                <td className={dataTable.numeric}>{l.unchanged}</td>
                <td className={dataTable.numeric}>{l.leftOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {check.ignoredColumns.length > 0 && (
        <p className={styles.note}>
          These columns aren&apos;t used and were ignored: {check.ignoredColumns.join(', ')}
        </p>
      )}
      {check.needMoreFields > 0 && (
        <p className={styles.note}>
          {check.needMoreFields} records will need more fields before submitting or publishing.
        </p>
      )}
      {check.problems.length > 0 && (
        <ProblemsTable problems={check.problems} fileName={check.fileName} />
      )}
    </div>
  );
}

export function ProblemsTable({
  problems,
  fileName,
}: {
  problems: ImportProblem[];
  fileName: string;
}) {
  return (
    <>
      <div className={styles.row}>
        <SectionHeading level={3} rank="label">
          Problems ({problems.length})
        </SectionHeading>
        <Button
          variant="tertiary"
          size="sm"
          icon={<Download />}
          onClick={() => downloadProblems(problems, fileName)}
        >
          Download problem list
        </Button>
      </div>
      <div
        className={styles.tableScroll}
        role="region"
        aria-label="Problems, scrolls sideways"
        tabIndex={0}
      >
        <table className={cx(dataTable.table, styles.table)}>
          <caption className="visually-hidden">Problems</caption>
          <thead>
            <tr>
              <th scope="col">Sheet</th>
              <th scope="col" className={dataTable.numeric}>
                Row
              </th>
              <th scope="col">Column</th>
              <th scope="col">Value found</th>
              <th scope="col">Reason</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p, i) => (
              <tr key={`${p.sheet}-${p.row}-${i}`}>
                <td>{p.sheet}</td>
                <td className={dataTable.numeric}>{p.row}</td>
                <td>{p.column}</td>
                <td>{p.value}</td>
                <td>{p.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
