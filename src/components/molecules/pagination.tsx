"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_CHOICES, type PageSize } from "@/lib/page-size";

interface PaginationProps<C extends PageSize = PageSize> {
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
   *
   * `choices` narrows the list per screen: 500 stays offered on /listings/mine
   * (light rows, ~40 ko gzip) but not on /applications (heavy cards, ~78 ko
   * gzip + ~12 000 DOM nodes nobody scrolls through). Defaults to the shared
   * list so existing callers keep working unchanged.
   */
  pageSize?: C;
  onPageSizeChange?: (size: C) => void;
  choices?: readonly C[];
  /**
   * Extra classes, headline use: tighter air between the table and this row.
   *
   * `mt-8` is the document-flow margin — a pager under content the page scrolls,
   * where nothing above it is a bounded frame. In a full-height card the table
   * frame already reaches for the foot (`lg:flex-1`), and its border is the
   * boundary this row reads against, so `mt-8` is a step of air repeated twice
   * on one edge. Pass `mt-3` instead: `twMerge` resolves the two against each
   * other, and callers who pass nothing keep the flow margin.
   */
  className?: string;
}

/**
 * One call to page through, drawn in the site's own control language.
 *
 * The disposition is the classic one — « Précédent », the count, « Suivant » on
 * a single line, each element on the same vertical centre — dressed in the
 * site's pill kit: the turn lives in a recessed track, the container
 * `SegmentedControl` draws, and the size choice is an outlined pill beside it,
 * reading as the small field it is next to the bigger controls above. The one
 * lesson this row keeps from its predecessor: the buttons are `inline-flex`
 * *deliberately* — an icon in an undressed `<button>` stacks itself over (or
 * under) the word, which is how the row once read as three misaligned
 * fragments.
 *
 * Below 400px the arrows' words give way and the icons answer alone; the row
 * never wraps, and `aria-label` carries what the icons stand for.
 */
const TRACK_PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1 text-[0.8125rem] font-medium whitespace-nowrap text-foreground transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50";

export function Pagination<C extends PageSize = PageSize>({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  pageSize,
  onPageSizeChange,
  choices = PAGE_SIZE_CHOICES as unknown as readonly C[],
  className,
}: PaginationProps<C>) {
  const canChooseSize = onPageSizeChange !== undefined;
  const hasMoreThanOnePage = totalPages > 1;

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
      className={cn(
        "mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3",
        className,
      )}
    >
      {hasMoreThanOnePage ? (
        <div className="flex items-center rounded-full bg-surface-2 p-1">
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

          <span className="px-1.5 text-[0.8125rem] whitespace-nowrap text-muted tabular-nums">
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
        <span className="text-[0.8125rem] text-muted">Une seule page</span>
      )}

      {canChooseSize && (
        /*
          A `<label>` wrapped *around* the control rather than a `for`: the
          association is native, so the whole pill is the click target and a
          screen reader reads « Par page » into the control — the `Select`
          molecule cannot, whose label renders as a stacked block above the field.
          The select itself is transparent and unfurnished; the pill around it is
          the field chrome.
        */
        <label
          className={cn(
            // `py-1.5`, not `py-1`: the outlined pill stands beside the recessed
            // track, and the two answer for their height independently — a
            // thinner field next to a thicker track reads as sitting on a
            // different baseline.
            "flex shrink-0 cursor-pointer items-center rounded-full border border-border py-1.5 pr-1.5 pl-3.5 transition-colors",
            "hover:border-border-strong has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring",
            loading && "pointer-events-none opacity-50",
          )}
        >
          <span className="cursor-pointer text-[0.8125rem] text-muted">
            Par page
          </span>
          <span className="relative">
            <select
              aria-label="Lignes par page"
              disabled={loading}
              value={String(pageSize)}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value) as C)
              }
              className="cursor-pointer appearance-none bg-transparent py-0 pr-5 pl-1.5 text-[0.8125rem] font-medium whitespace-nowrap text-foreground focus:outline-none disabled:cursor-not-allowed"
            >
              {choices.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2 text-muted" />
          </span>
        </label>
      )}
    </nav>
  );
}
