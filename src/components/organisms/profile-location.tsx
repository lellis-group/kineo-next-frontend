import { MapPinIcon } from "@/components/atoms/icons";
import { MapPaper, type MapPaperPin } from "@/components/molecules/map-paper";
import { Panel } from "@/components/molecules/panel";

/** One pin, the member's: the paper is a still, so the spot is symbolic. */
const PIN: readonly MapPaperPin[] = [{ x: 50, y: 52, active: true }];

/**
 * Where the member practises, on the console's map paper. The paper is
 * decorative; the city is the fact, written in the card on the pin.
 */
export function ProfileLocation({
  city,
  onEdit,
  className,
}: {
  city: string | null;
  onEdit: () => void;
  className?: string;
}) {
  return (
    <Panel
      title="Zone d'exercice"
      flush
      className={className}
      action={
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          Modifier
        </button>
      }
    >
      <div className="px-2 pb-2">
        <MapPaper pins={city ? PIN : []} className="h-52 sm:h-full sm:min-h-52">
          {city ? (
            <span className="absolute top-[52%] left-1/2 ml-5 -translate-y-1/2 rounded-control bg-map-card px-3 py-2 shadow-[0_4px_16px_rgb(22_21_15/0.2)]">
              <span className="block text-xs font-medium whitespace-nowrap text-map-ink">
                {city}
              </span>
              <span className="block text-[0.625rem] whitespace-nowrap text-map-muted">
                Ville principale
              </span>
            </span>
          ) : (
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex items-center gap-2 rounded-full bg-map-card px-4 py-2 text-xs text-map-muted shadow-[0_2px_10px_rgb(22_21_15/0.18)]">
                <MapPinIcon className="size-3.5" />
                Ville non renseignée
              </span>
            </span>
          )}
        </MapPaper>
      </div>
      {/* The paper is aria-hidden: the fact is said here too. */}
      <p className="sr-only">
        {city
          ? `Ville principale : ${city}`
          : "Ville principale non renseignée"}
      </p>
    </Panel>
  );
}
