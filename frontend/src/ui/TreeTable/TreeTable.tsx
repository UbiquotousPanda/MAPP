import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { cx } from '../cx';
import { DisclosureButton, DisclosureSpace } from '../DisclosureButton/DisclosureButton';
import dataTable from '../Table/Table.module.css';
import { ActionsMenu } from '../ActionsMenu/ActionsMenu';
import type { ActionsMenuItem } from '../ActionsMenu/ActionsMenu';
import { LevelTag } from '../LevelTag/LevelTag';
import type { PlanningLevel } from '../LevelTag/LevelTag';
import styles from './TreeTable.module.css';

export interface TreeNode {
  id: string;
  level: PlanningLevel;
  name: string;
  /** Where the name leads (the record's page or panel); Enter on the row goes there too. */
  href?: string;
  onOpen?: () => void;
  cells: Record<string, ReactNode>;
  children: TreeNode[];
  actions?: ActionsMenuItem[];
  /** The hover grey, for the record just created, moved or copied; it is scrolled into view. */
  highlighted?: boolean;
}

export interface TreeTableColumn {
  key: string;
  header: string;
  /** 'end' right-aligns the column and keeps its values on one line, for money (design system §4). */
  align?: 'start' | 'end';
  /** The narrowest the column may become, so a person or team never squeezes: "160px". */
  minWidth?: string;
}

export type TreeTableFooter = Record<string, ReactNode>;

export interface TreeTableProps {
  label: string;
  /** The first column holds the names; its cell is shown after the name (an ID, a count). */
  columns: TreeTableColumn[];
  nodes: TreeNode[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  emptyText?: string;
  footer?: TreeTableFooter;
}

interface Row {
  node: TreeNode;
  depth: number;
  position: number;
  siblings: number;
  parentId?: string;
}

export function TreeTable({
  label,
  columns,
  nodes,
  expandedIds,
  onToggle,
  emptyText,
  footer,
}: TreeTableProps) {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rows = visibleRows(nodes, expandedIds);
  const hasActions = rows.some((row) => row.node.actions && row.node.actions.length > 0);
  const tabbableId = rows.some((row) => row.node.id === focusedId) ? focusedId : rows[0]?.node.id;
  const highlightedId = rows.find((row) => row.node.highlighted)?.node.id;
  const [nameColumn, ...otherColumns] = columns;

  useEffect(() => {
    if (highlightedId) {
      rowOf(tableRef.current, highlightedId)?.scrollIntoView({ block: 'center' });
    }
  }, [highlightedId]);

  function focusRow(id: string | undefined) {
    if (id) {
      setFocusedId(id);
      rowOf(tableRef.current, id)?.focus();
    }
  }

  function open(node: TreeNode) {
    if (node.onOpen) {
      node.onOpen();
    } else if (node.href) {
      void navigate(node.href);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row, index: number) {
    // Keys typed in a control inside the row (the ⋯ menu) are that control's.
    if (event.target !== event.currentTarget) {
      return;
    }
    const { node } = row;
    const hasChildren = node.children.length > 0;
    const expanded = expandedIds.has(node.id);
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusRow(rows[index + 1]?.node.id),
      ArrowUp: () => focusRow(rows[index - 1]?.node.id),
      Home: () => focusRow(rows[0]?.node.id),
      End: () => focusRow(rows[rows.length - 1]?.node.id),
      ArrowRight: () => {
        if (hasChildren && !expanded) {
          onToggle(node.id);
        } else if (hasChildren) {
          focusRow(node.children[0]?.id);
        }
      },
      ArrowLeft: () => {
        if (hasChildren && expanded) {
          onToggle(node.id);
        } else {
          focusRow(row.parentId);
        }
      },
      Enter: () => open(node),
    };
    const action = keys[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  return (
    <div className={styles.scroll}>
      {/* eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-to-interactive-role -- the ARIA treegrid pattern on a table */}
      <table ref={tableRef} role="treegrid" aria-label={label} className={dataTable.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(column.align === 'end' && dataTable.numeric)}
                style={column.minWidth ? { minWidth: column.minWidth } : undefined}
              >
                {column.header}
              </th>
            ))}
            {hasActions && (
              <th scope="col" className={styles.actionsColumn}>
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyText && (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} className={dataTable.empty}>
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((row, index) => {
            const { node } = row;
            const hasChildren = node.children.length > 0;
            const expanded = hasChildren && expandedIds.has(node.id);
            return (
              <tr
                key={node.id}
                data-row-id={node.id}
                aria-level={row.depth}
                aria-posinset={row.position}
                aria-setsize={row.siblings}
                aria-expanded={hasChildren ? expanded : undefined}
                tabIndex={node.id === tabbableId ? 0 : -1}
                onFocus={(event) => {
                  if (event.target === event.currentTarget) {
                    setFocusedId(node.id);
                  }
                }}
                onKeyDown={(event) => onKeyDown(event, row, index)}
                className={cx(styles.row, node.highlighted && styles.highlighted)}
              >
                <td className={cx(styles.nameCell, styles[node.level])}>
                  <div className={styles.name} style={{ paddingLeft: `${(row.depth - 1) * 20}px` }}>
                    {hasChildren ? (
                      <DisclosureButton
                        expanded={expanded}
                        label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
                        tabIndex={-1}
                        onClick={() => onToggle(node.id)}
                      />
                    ) : (
                      <DisclosureSpace />
                    )}
                    <LevelTag level={node.level} />
                    <span className={styles.title}>
                      {node.href ? (
                        <Link to={node.href} tabIndex={-1} className={styles.link}>
                          {node.name}
                        </Link>
                      ) : node.onOpen ? (
                        <button
                          type="button"
                          tabIndex={-1}
                          className={styles.linkButton}
                          onClick={node.onOpen}
                        >
                          {node.name}
                        </button>
                      ) : (
                        <span className={styles.text}>{node.name}</span>
                      )}
                      {nameColumn && node.cells[nameColumn.key] !== undefined && (
                        <span className={styles.extra}>{node.cells[nameColumn.key]}</span>
                      )}
                    </span>
                  </div>
                </td>
                {otherColumns.map((column) => (
                  <td key={column.key} className={cx(column.align === 'end' && dataTable.numeric)}>
                    {node.cells[column.key]}
                  </td>
                ))}
                {hasActions && (
                  <td className={styles.actionsCell}>
                    {node.actions && node.actions.length > 0 && (
                      <ActionsMenu label={node.name} items={node.actions} />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        {footer && (
          <tfoot>
            <tr className={dataTable.total}>
              {nameColumn && <th scope="row">{footer[nameColumn.key]}</th>}
              {otherColumns.map((column) => (
                <td key={column.key} className={cx(column.align === 'end' && dataTable.numeric)}>
                  {footer[column.key]}
                </td>
              ))}
              {hasActions && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function visibleRows(nodes: TreeNode[], expandedIds: Set<string>): Row[] {
  const rows: Row[] = [];
  function walk(level: TreeNode[], depth: number, parentId?: string) {
    level.forEach((node, index) => {
      rows.push({ node, depth, position: index + 1, siblings: level.length, parentId });
      if (expandedIds.has(node.id)) {
        walk(node.children, depth + 1, node.id);
      }
    });
  }
  walk(nodes, 1);
  return rows;
}

function rowOf(table: HTMLTableElement | null, id: string): HTMLTableRowElement | undefined {
  const all = table?.querySelectorAll<HTMLTableRowElement>('tr[data-row-id]') ?? [];
  return [...all].find((element) => element.dataset.rowId === id);
}
