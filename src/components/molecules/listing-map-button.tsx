import { MapIcon } from "@/components/atoms/icons";

/**
 * The « see this posting on the map » control, shared by the table and the
 * mobile card. `aria-pressed` mirrors the pin's selected ring.
 */
export function ListingMapButton({
  title,
  pressed,
  onSelect,
}: {
  title: string;
  /** True while this posting is the reader's choice, on either half. */
  pressed: boolean;
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
