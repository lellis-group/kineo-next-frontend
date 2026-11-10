import { MapIcon } from "@/components/atoms/icons";

/**
 * The « see this posting on the map » control, as both presentations of the list
 * draw it.
 *
 * One control, two homes — the table's « Carte » column and the mobile card's
 * title row — so it is written once: the size (a 24 px circle, the height of a
 * first text line on either presentation), the faint ink that darkens to
 * primary on hover, and the accessible name are a single fact, not two copies
 * that could disagree.
 *
 * `aria-pressed` announces the choice the same way the map's own pins do: the
 * cream ring and the pressed state are one selection in two languages. The
 * caller decides whether the control is drawn at all — a posting whose practice
 * was never geocoded has nothing to fly to, and a control that cannot act is
 * worse than no control.
 */
export function ListingMapButton({
  title,
  pressed,
  onSelect,
}: {
  /** The posting's title, as the accessible name reads it out. */
  title: string;
  /** True while this posting is the reader's choice, on either half. */
  pressed: boolean;
  /** Brings the posting to the map — the same choice the row's title link opens. */
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Voir ${title} sur la carte`}
      aria-pressed={pressed}
      onClick={onSelect}
      className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-faint transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <MapIcon className="size-3.5" />
    </button>
  );
}
