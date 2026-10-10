"use client";

import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/atoms/icons";

interface PaginationProps {
  /** Current page number (1-based). */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

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
