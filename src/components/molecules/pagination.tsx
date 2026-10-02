"use client";

import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/atoms/icons";

interface PaginationProps {
  /** Current page number (1-based). */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Callback when page changes. */
  onPageChange: (page: number) => void;
}

/**
 * Pagination controls — previous/next buttons with page indicator.
 *
 * Hides itself when there is one page. That check used to be written at each
 * call site instead, which meant three copies of it and a docblock here claiming
 * the opposite — the component has never rendered on a single page, so the
 * comment described a behaviour nobody had. One page needs no way to change it,
 * and « Page 1 sur 1 » is noise under a short list.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-3 sm:justify-center sm:gap-4"
    >
      <Button
        variant="outline"
        size="md"
        disabled={!hasPrevious || totalPages <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Page précédente"
        className="min-w-11 shrink-0 px-3 sm:min-w-0 sm:px-5"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span className="hidden min-[400px]:inline">Précédent</span>
      </Button>

      <span className="text-sm whitespace-nowrap text-muted">
        Page {currentPage} sur {totalPages}
      </span>

      <Button
        variant="outline"
        size="md"
        disabled={!hasNext || totalPages <= 1}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Page suivante"
        className="min-w-11 shrink-0 px-3 sm:min-w-0 sm:px-5"
      >
        <span className="hidden min-[400px]:inline">Suivant</span>
        <ArrowRightIcon className="h-4 w-4" />
      </Button>
    </nav>
  );
}
