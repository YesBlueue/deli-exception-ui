"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table } from "@radix-ui/themes";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Applied to body cells only; headers stay uniform. */
  className?: string;
}

/**
 * Table from `xl` up (wide tables need the room), stacked list below. Rows with an `href` open on click or Enter in the
 * table, and are links in the list.
 */
export function DataTable<T>({ label, columns, rows, rowKey, rowHref, renderMobile }: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  renderMobile: (row: T) => ReactNode;
}) {
  const router = useRouter();
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <Table.Root variant="ghost" size="2" aria-label={label}>
          <Table.Header>
            <Table.Row>
              {columns.map((c) => <Table.ColumnHeaderCell key={c.header}>{c.header}</Table.ColumnHeaderCell>)}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <Table.Row
                  key={rowKey(row)}
                  align="center"
                  {...(href && {
                    tabIndex: 0,
                    onClick: () => router.push(href),
                    onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && router.push(href),
                    className: "cursor-pointer transition-colors hover:bg-accent focus-visible:bg-accent",
                  })}
                >
                  {columns.map((c) => <Table.Cell key={c.header} className={c.className}>{c.cell(row)}</Table.Cell>)}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </div>
      <ul aria-label={label} className="divide-y xl:hidden">
        {rows.map((row) => {
          const href = rowHref?.(row);
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href} className="flex items-center gap-3 p-4 hover:bg-accent">
                  <div className="min-w-0 flex-1">{renderMobile(row)}</div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ) : (
                <div className="p-4">{renderMobile(row)}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
