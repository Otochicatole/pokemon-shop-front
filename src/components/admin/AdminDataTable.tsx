import type { ReactNode } from 'react';
import styles from './AdminDataTable.module.css';

export interface AdminTableColumn<T> {
  key: string;
  header: ReactNode;
  headerLabel?: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'No hay resultados para mostrar.',
  caption,
  isRowSelected,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
  isRowSelected?: (row: T) => boolean;
}) {
  if (!rows.length) return <div className={styles.adminTableEmpty}>{empty}</div>;
  return (
    <div className={styles.adminTableWrap}>
      <table className={styles.adminDataTable}>
        {caption && <caption className={styles.srOnly}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" style={{ textAlign: column.align ?? 'left' }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={isRowSelected?.(row) ? styles.adminTableRowSelected : undefined} data-selected={isRowSelected?.(row) ? 'true' : undefined}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.headerLabel ?? (typeof column.header === 'string' ? column.header : column.key)}
                  style={{ textAlign: column.align ?? 'left' }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
