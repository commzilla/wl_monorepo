import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ResponsiveColumn<T> {
  key: string;
  label: string;
  hideOnMobile?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  data: T[];
  onRowClick?: (row: T, index: number) => void;
  keyExtractor?: (row: T, index: number) => string;
  className?: string;
  emptyMessage?: string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  className,
  emptyMessage = "No data found.",
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  const getKey = (row: T, index: number) =>
    keyExtractor ? keyExtractor(row, index) : row.id ?? index;

  const getCellValue = (row: T, col: ResponsiveColumn<T>, index: number) => {
    if (col.render) return col.render(row, index);
    const val = row[col.key];
    if (val === null || val === undefined) return "—";
    return String(val);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>
    );
  }

  // Mobile: Card-based layout
  if (isMobile) {
    const mobileColumns = columns.filter((c) => !c.hideOnMobile);

    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, rowIdx) => (
          <Card
            key={getKey(row, rowIdx)}
            className={cn(
              "p-4 space-y-2",
              onRowClick && "cursor-pointer active:scale-[0.98] transition-transform",
            )}
            onClick={() => onRowClick?.(row, rowIdx)}
          >
            {mobileColumns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {col.label}
                </span>
                <span className="text-sm text-right">{getCellValue(row, col, rowIdx)}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Standard table
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIdx) => (
          <TableRow
            key={getKey(row, rowIdx)}
            className={cn(onRowClick && "cursor-pointer")}
            onClick={() => onRowClick?.(row, rowIdx)}
          >
            {columns.map((col) => (
              <TableCell key={col.key}>{getCellValue(row, col, rowIdx)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
