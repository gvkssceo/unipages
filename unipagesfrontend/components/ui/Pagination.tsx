'use client';

import { ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const itemsPerPageOptions = [5, 10, 25, 50, 100];

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(e.currentTarget.value);
      if (page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    }
  };

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg p-3", className)}>
      {/* Responsive layout that adapts to container width */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Section - Item Count and Selection (Compact) */}
        <div className="flex items-center space-x-3 text-sm">
          <span className="text-gray-700 whitespace-nowrap">
            {startItem}-{endItem} of {totalItems}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-700">Show</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={itemsPerPage}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 1000) {
                  onItemsPerPageChange(value);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt(e.currentTarget.value);
                  if (value >= 1 && value <= 1000) {
                    onItemsPerPageChange(value);
                  }
                }
              }}
              className="w-14 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            />
            <span className="text-gray-700">per page</span>
          </div>
        </div>

        {/* Middle Section - Page Navigation (Compact) */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            title="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            title="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          
          {/* Compact page info */}
          <div className="flex items-center space-x-2 mx-2">
            <span className="text-sm text-gray-700">Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={handlePageInputChange}
              onKeyPress={handlePageInputKeyPress}
              className="w-12 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
            />
            <span className="text-sm text-gray-700">of {totalPages}</span>
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentPage === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            title="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={cn(
              "p-1.5 rounded transition-colors",
              currentPage === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
            title="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right Section - Quick Select (Compact) */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={currentPage}
              onChange={(e) => onPageChange(parseInt(e.target.value))}
              className="appearance-none bg-transparent border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
