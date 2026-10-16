"use client";

import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/atoms/icons";
import { Select } from "@/components/molecules/select";
import { PAGE_SIZE_CHOICES, type PageSize } from "@/lib/page-size";

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
  /**
   * The current page size, and the handler for a new one.
   *
   * The handler decides: a size control with nothing to change it to is a
   * decoration, and the browse feed — which offers no choice — passes neither.
   *
   * A change returns to page 1 in both callers: the reader asked for a different
   * slice, and page 7 of the new size is rarely page 7 of what is on screen.
   */
  pageSize?: PageSize;
  onPageSizeChange?: (size: PageSize) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  const hasMoreThanOnePage = totalPages > 1;
  const canChooseSize = onPageSizeChange !== undefined;

  // A member with three rows has one page and nothing to page through, but the
  // size that got them there is still theirs to change, and this control is what
  // says so. Hiding it on a single page would make the choice appear and
  // disappear with the collection.
  if (!hasMoreThanOnePage && !canChooseSize) {
    return null;
  }

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      aria-busy={loading}
      className="mt-8 flex flex-wrap items-center justify-between gap-3 sm:justify-center sm:gap-4"
    >
      {hasMoreThanOnePage && (
        <Button
          variant="outline"
          size="md"
          disabled={!hasPrevious || loading}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Page précédente"
          className="min-w-11 shrink-0 px-3 sm:min-w-0 sm:px-5"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="hidden min-[400px]:inline">Précédent</span>
        </Button>
      )}

      <span className="text-sm whitespace-nowrap text-muted">
        {hasMoreThanOnePage
          ? `Page ${currentPage} sur ${totalPages}`
          : "Une seule page"}
      </span>

      {hasMoreThanOnePage && (
        <Button
          variant="outline"
          size="md"
          disabled={!hasNext || loading}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Page suivante"
          className="min-w-11 shrink-0 px-3 sm:min-w-0 sm:px-5"
        >
          <span className="hidden min-[400px]:inline">Suivant</span>
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      )}

      {canChooseSize && (
        <Select
          // The label names the choice on screen; `aria-label` is what the control
          // itself announces. On a narrow phone the text gives way to the value.
          label={<span className="sr-only sm:not-sr-only">Par page</span>}
          aria-label="Lignes par page"
          value={String(pageSize)}
          disabled={loading}
          onChange={(event) =>
            onPageSizeChange(Number(event.target.value) as PageSize)
          }
          className="w-auto py-0 text-sm"
        >
          {PAGE_SIZE_CHOICES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </Select>
      )}
    </nav>
  );
}
