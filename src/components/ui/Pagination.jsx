import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accessible Pagination Component for Porch Light
 * Follows Porch Light design tokens, Space Mono fonts, and clean focus outlines.
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null;

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  const handlePageClick = (page) => {
    if (page === currentPage || page === '...') return;
    onPageChange(page);
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={cn('flex items-center justify-center gap-1.5 sm:gap-2 select-none font-mono text-xs', className)}
    >
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
        className={cn(
          'inline-flex items-center gap-1 px-3 py-2 rounded-full border border-dark-gray/20 transition-all font-medium',
          currentPage <= 1
            ? 'opacity-40 cursor-not-allowed bg-transparent text-charcoal/50 border-dark-gray/10'
            : 'bg-porcelain text-charcoal hover:bg-deep-purple hover:text-white hover:border-deep-purple active:scale-95'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Numbered Page Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`dots-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-charcoal/40 font-mono"
              >
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => handlePageClick(p)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Go to page ${p}`}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all font-mono font-medium',
                isCurrent
                  ? 'bg-deep-purple text-porcelain shadow-sm border border-deep-purple scale-105'
                  : 'bg-porcelain text-charcoal/80 border border-dark-gray/15 hover:border-dark-gray/40 hover:bg-sand/30 active:scale-95'
              )}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <button
        type="button"
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
        className={cn(
          'inline-flex items-center gap-1 px-3 py-2 rounded-full border border-dark-gray/20 transition-all font-medium',
          currentPage >= totalPages
            ? 'opacity-40 cursor-not-allowed bg-transparent text-charcoal/50 border-dark-gray/10'
            : 'bg-porcelain text-charcoal hover:bg-deep-purple hover:text-white hover:border-deep-purple active:scale-95'
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export default Pagination;
