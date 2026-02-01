import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Page header skeleton
export const PageHeaderSkeleton: React.FC<{ withAction?: boolean }> = ({ withAction = true }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div className="space-y-1">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
    {withAction && <Skeleton className="h-10 w-32 mt-4 sm:mt-0" />}
  </div>
);

// Stats grid skeleton (e.g., Overview page)
export const StatsGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Card grid skeleton (e.g., Agents list)
export const CardGridSkeleton: React.FC<{
  count?: number;
  columns?: 1 | 2 | 3 | 4;
}> = ({ count = 3, columns = 3 }) => (
  <div className={cn(
    'grid gap-4',
    columns === 1 && 'grid-cols-1',
    columns === 2 && 'grid-cols-1 md:grid-cols-2',
    columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  )}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 5 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Filter bar skeleton
export const FilterBarSkeleton: React.FC<{ filterCount?: number }> = ({ filterCount = 4 }) => (
  <Card className="border-border/50">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: filterCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-[150px]" />
        ))}
      </div>
    </CardContent>
  </Card>
);

// Full page skeleton (combines header + content)
interface PageSkeletonProps {
  header?: boolean;
  headerAction?: boolean;
  filters?: boolean;
  filterCount?: number;
  content?: 'cards' | 'table' | 'stats';
  contentCount?: number;
  columns?: 1 | 2 | 3 | 4;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  header = true,
  headerAction = true,
  filters = false,
  filterCount = 4,
  content = 'cards',
  contentCount = 3,
  columns = 3,
}) => (
  <div className="space-y-6">
    {header && <PageHeaderSkeleton withAction={headerAction} />}
    {filters && <FilterBarSkeleton filterCount={filterCount} />}
    {content === 'stats' && <StatsGridSkeleton count={contentCount} />}
    {content === 'cards' && <CardGridSkeleton count={contentCount} columns={columns} />}
    {content === 'table' && <TableSkeleton rows={contentCount} />}
  </div>
);

export default PageSkeleton;
