import type { ReactNode } from 'react';

export interface AdminTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

export function AdminDataTable<T>({ columns, rows, rowKey, empty = 'No hay resultados para mostrar.', caption }: { columns: AdminTableColumn<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode; caption?: string }) {
  if (!rows.length) return <div className="admin-table-empty">{empty}</div>;
  return <div className="admin-table-wrap"><table className="admin-data-table">{caption && <caption className="sr-only">{caption}</caption>}<thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={{ textAlign: column.align ?? 'left' }}>{column.header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} data-label={column.header} style={{ textAlign: column.align ?? 'left' }}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
