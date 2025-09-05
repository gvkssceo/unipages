'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTableHeaderProps {
  field: string;
  label: string;
  currentSortField: string;
  currentSortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

export function SortableTableHeader({
  field,
  label,
  currentSortField,
  currentSortDirection,
  onSort,
  className
}: SortableTableHeaderProps) {
  const isActive = currentSortField === field;
  
  return (
    <th 
      scope="col" 
      className={cn(
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none",
        className
      )}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronUp 
            className={cn(
              "h-3 w-3",
              isActive && currentSortDirection === 'asc' 
                ? "text-blue-600" 
                : "text-gray-300"
            )} 
          />
          <ChevronDown 
            className={cn(
              "h-3 w-3 -mt-1",
              isActive && currentSortDirection === 'desc' 
                ? "text-blue-600" 
                : "text-gray-300"
            )} 
          />
        </div>
      </div>
    </th>
  );
}
