import React from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  renderMobileCard?: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  renderMobileCard,
  emptyState,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => {
          const key = keyExtractor(item);

          // If custom mobile card renderer is provided, use it
          if (renderMobileCard) {
            return (
              <div
                key={key}
                onClick={() => onRowClick?.(item)}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {renderMobileCard(item)}
              </div>
            );
          }

          // Default card layout
          return (
            <Card
              key={key}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4 space-y-2">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">
                        {column.header}
                      </span>
                      <span className="text-sm text-right">{column.render(item)}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={keyExtractor(item)}
            className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
            onClick={() => onRowClick?.(item)}
          >
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.render(item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ResponsiveTable;
