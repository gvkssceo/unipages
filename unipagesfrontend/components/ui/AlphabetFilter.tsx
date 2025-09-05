'use client';

import { cn } from '@/lib/utils';

interface AlphabetFilterProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

export function AlphabetFilter({ selectedFilter, onFilterChange, className }: AlphabetFilterProps) {
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  
  return (
    <div className={cn("bg-white p-1 rounded-md w-full", className)}>
      <div className="flex flex-wrap items-center gap-1 justify-end">
        {/* A-Z Letters in a single line when space allows, wrap when not */}
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => onFilterChange(letter)}
            className={cn(
              "px-1 py-0.5 text-xs font-medium transition-colors text-center rounded h-5 leading-none",
              selectedFilter === letter
                ? "bg-blue-100 text-blue-700 font-semibold"
                : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            )}
          >
            {letter}
          </button>
        ))}
        
        {/* Other */}
        <button
          onClick={() => onFilterChange('Other')}
          className={cn(
            "px-1 py-0.5 text-xs font-medium transition-colors text-center rounded h-5 leading-none",
            selectedFilter === 'Other'
              ? "bg-blue-100 text-blue-700 font-semibold"
              : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          )}
        >
          Other
        </button>
        
        {/* All */}
        <button
          onClick={() => onFilterChange('All')}
          className={cn(
            "px-1 py-0.5 text-xs font-medium transition-colors text-center rounded h-5 leading-none",
            selectedFilter === 'All'
              ? "bg-blue-100 text-blue-700 font-semibold"
              : "text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          )}
        >
          All
        </button>
      </div>
    </div>
  );
}
