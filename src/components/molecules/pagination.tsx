"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/atoms/icons";
import { SelectPill } from "@/components/atoms/select-pill";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_CHOICES, type PageSize } from "@/lib/page-size";

interface PaginationProps<C extends PageSize = PageSize> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * A page turn is in flight: disables the arrows, so clicking faster than the
   * network answers can't send a burst the backend rate-limits.
   */
  loading?: boolean;
  /** The nonce of a pick that changed page: keys the count so the flash replays. */
  highlight?: number | null;
  /** Without a handler, no size control is drawn. `choices` narrows the list per screen. */
  pageSize?: C;
  onPageSizeChange?: (size: C) => void;
  choices?: readonly C[];
  /** E.g. `mt-3` to replace the flow margin under a bordered table frame. */
  className?: string;
}

const TRACK_PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1 text-control font-medium whitespace-nowrap text-foreground transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50";

/**
 * Previous / count / next in a recessed track, with an optional page-size
 * pill. Below 400px the arrows' words hide and `aria-label` carries them.
 */
export function Pagination<C extends PageSize = PageSize>({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  highlight,
  pageSize,
  onPageSizeChange,
  choices = PAGE_SIZE_CHOICES as unknown as readonly C[],
  className,
}: PaginationProps<C>) {
  const canChooseSize = onPageSizeChange !== undefined;
  const hasMoreThanOnePage = totalPages > 1;

  // Still drawn on a single page when the size can be changed.
  if (!hasMoreThanOnePage && !canChooseSize) {
    return null;
  }

  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      aria-busy={loading}
      className={cn(
        "mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3",
        className,
      )}
    >
      {hasMoreThanOnePage ? (
        <div className="flex items-center rounded-full border border-border p-1">
          <button
            type="button"
            disabled={!hasPrevious || loading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Page précédente"
            className={TRACK_PILL}
          >
            <ArrowLeftIcon className="size-3.5 shrink-0" />
            <span className="hidden min-[400px]:inline">Précédent</span>
          </button>

          <span
            key={highlight ?? "page"}
            className={cn(
              "px-1.5 text-control whitespace-nowrap text-muted tabular-nums",
              highlight != null && "pager-spotlight",
            )}
          >
            {`Page ${currentPage} sur ${totalPages}`}
          </span>

          <button
            type="button"
            disabled={!hasNext || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Page suivante"
            className={TRACK_PILL}
          >
            <span className="hidden min-[400px]:inline">Suivant</span>
            <ArrowRightIcon className="size-3.5 shrink-0" />
          </button>
        </div>
      ) : (
        <span className="text-control text-muted">Une seule page</span>
      )}

      {canChooseSize && (
        <SelectPill
          label="Par page"
          ariaLabel="Lignes par page"
          value={String(pageSize)}
          disabled={loading}
          onChange={(value) => onPageSizeChange(Number(value) as C)}
          options={choices.map((size) => ({
            value: String(size),
            label: `${size} / page`,
          }))}
        />
      )}
    </nav>
  );
}
