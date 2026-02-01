import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  title?: string;
  className?: string;
  showCard?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  activeFilterCount = 0,
  onClearFilters,
  title = 'Filters',
  className,
  showCard = true,
}) => {
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-4">{children}</div>
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={cn('border-border/50', className)}>
      <CardContent className="pt-6">{content}</CardContent>
    </Card>
  );
};

// Individual filter item wrapper for consistent styling
interface FilterItemProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export const FilterItem: React.FC<FilterItemProps> = ({
  children,
  label,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="text-xs text-muted-foreground">{label}</label>
      )}
      {children}
    </div>
  );
};

export default FilterBar;
