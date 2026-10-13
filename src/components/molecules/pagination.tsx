"use client";

import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/atoms/icons";

interface PaginationProps {
  /** Current page number (1-based). */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * A page turn is in flight. Disables both arrows for its duration.
   *
   * Not cosmetic. Each turn is a request the backend rate-limits, and a reader
   * clicking through pages faster than the network answers sends a burst that
   * earns a 429 — the very situation where they most need to be told something
   * went wrong, and where the previous request being cancelled would otherwise
   * swallow that message. Holding the arrows for the length of one turn both
   * stops the burst and keeps the pager honest about what is being loaded.
   */
  loading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      aria-busy={loading}
      className="mt-8 flex items-center justify-between gap-3 sm:justify-center sm:gap-4"
    >
      <Button
        variant="outline"
        size="md"
        disabled={!hasPrevious || totalPages <= 1 || loading}
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
        disabled={!hasNext || totalPages <= 1 || loading}
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
