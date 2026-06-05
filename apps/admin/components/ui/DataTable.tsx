"use client";
import { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export default function DataTable<T extends { _id?: string | undefined }>({
  rows,
  columns,
  rowHref,
  onRowClick,
  loading,
  emptyMessage = "No data.",
}: {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}) {
  if (loading || rows === undefined) {
    return <div className="text-sm text-gray-500 py-6 text-center">Loading…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-6 text-center">{emptyMessage}</div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left font-mono uppercase text-xs tracking-wider text-gray-500">
          {columns.map((c) => (
            <th key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          if (rowHref) {
            return (
              <tr
                key={(row._id as string) ?? i}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  window.location.href = rowHref(row);
                }}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          }
          return (
            <tr
              key={(row._id as string) ?? i}
              className={`border-b last:border-0 hover:bg-gray-50 ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
