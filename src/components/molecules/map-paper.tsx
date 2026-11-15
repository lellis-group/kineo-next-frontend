import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MapPaperPin {
  /** Position on the paper, in percent of its box. */
  x: number;
  y: number;
  /** The pin with the open card: drawn larger and in the accent. */
  active?: boolean;
}

/**
 * A still of the browse map, for marketing: the map's light paper, a few
 * streets, a river, and black pins. Decorative (`aria-hidden`); the real map
 * is MapLibre in `ListingsMap`.
 */
export function MapPaper({
  pins,
  children,
  className,
}: {
  pins: readonly MapPaperPin[];
  /** Overlays on the paper: a search pill, a popup card. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-card bg-map-base",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {/* Parks, then the river, then the street grid over both. */}
        <g fill="var(--map-park)" opacity={0.85}>
          <rect x="34" y="28" width="62" height="40" rx="4" />
          <rect x="286" y="150" width="70" height="46" rx="4" />
          <rect x="196" y="12" width="38" height="30" rx="4" />
        </g>
        <path
          d="M150 -10 C 170 60, 120 110, 168 160 S 210 230, 196 260"
          fill="none"
          stroke="var(--map-water)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <g stroke="var(--map-line)" strokeWidth="1.5" fill="none">
          <path d="M0 52 H400 M0 104 H400 M0 150 H400 M0 204 H400" />
          <path d="M60 0 V240 M118 0 V240 M240 0 V240 M300 0 V240 M352 0 V240" />
          <path d="M0 230 L400 18" strokeWidth="3" stroke="var(--map-card)" />
        </g>
      </svg>

      {pins.map((pin) => (
        <span
          key={`${pin.x}-${pin.y}`}
          className={cn(
            "absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_2px_6px_rgb(22_21_15/0.35)]",
            pin.active
              ? "size-6 bg-map-ink ring-4 ring-map-ink/15"
              : "size-4 bg-map-ink",
          )}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          <span
            className={cn(
              "rounded-full bg-map-base",
              pin.active ? "size-2" : "size-1.5",
            )}
          />
        </span>
      ))}

      {children}
    </div>
  );
}
