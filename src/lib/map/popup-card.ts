import type { Map as MapLibreMap } from "maplibre-gl";
import { zoomToPlace } from "@/lib/map/camera";
import {
  groupHeading,
  listingCount,
  practiceCount,
  shortReference,
  unlistedLine,
  zoomLabel,
} from "./popup-copy";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The popup body, built as DOM. Every piece of data goes through `textContent`;
 * the only markup set directly is the icon geometry at the bottom.
 *
 * The caller caps the root's `max-height` (see `openPopupForKey`): a group's
 * list is the part that scrolls, so the header and actions stay on screen.
 */
export interface PopupHandlers {
  onPick: (listing: MapPlaceListing) => void;
  onHover: (id: string | null) => void;
  onOpen?: (listing: MapPlaceListing) => void;
}

export function popupContent(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  handlers: PopupHandlers,
): HTMLElement {
  const [first] = place.listings;
  return place.count === 1 && first
    ? singleCard(place, first, map, dismiss, handlers.onOpen)
    : groupCard(place, map, dismiss, handlers);
}

/**
 * Marks the chosen posting's row in a group's card. Exported because the choice
 * can change from outside the card while it is open.
 */
export function markSelectedEntry(
  card: HTMLElement,
  selectedId: string | undefined,
) {
  for (const row of card.querySelectorAll<HTMLElement>(
    "button[data-listing-id]",
  )) {
    if (row.dataset.listingId === selectedId) {
      row.setAttribute("aria-current", "true");
    } else {
      row.removeAttribute("aria-current");
    }
  }
}

const CARD = "flex flex-col gap-3 p-3 text-left text-map-ink";

function singleCard(
  place: MapPlace,
  listing: MapPlaceListing,
  map: MapLibreMap,
  dismiss: () => void,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
): HTMLElement {
  const root = el("div", CARD);

  root.append(
    identity(
      disc(icon("box", "size-3")),
      shortReference(listing.id),
      twoTone("Période", listing.dateRange),
    ),
  );

  const posting = el("div", "flex min-w-0 flex-col gap-1 px-0.5");
  posting.append(
    el("h3", "line-clamp-3 text-sm leading-snug font-medium", listing.title),
    twoTone(listing.practiceName, listing.city, "place"),
  );
  root.append(posting);

  const actions = el("div", "flex items-center gap-2");
  actions.append(
    listingLink(listing, onOpen),
    zoomButton(place, map, dismiss, "icon"),
  );
  root.append(actions);

  return root;
}

function groupCard(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  handlers: PopupHandlers,
): HTMLElement {
  const root = el("div", CARD);
  const { heading, location } = groupHeading(place);

  const count = el(
    "span",
    "text-xs font-bold tabular-nums",
    String(place.count),
  );
  root.append(
    identity(
      disc(count),
      listingCount(place.count),
      location ? twoTone(heading, location, "place") : muted(heading),
    ),
  );

  // Guards a count with no previews behind it rather than throwing.
  if (place.listings.length > 0) {
    // The practice is already in the header when there is only one, so a row
    // names it only when the group spans several.
    const showPractice = practiceCount(place) > 1;

    const list = el(
      "ul",
      "-mx-1.5 flex max-h-[14rem] min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain",
    );
    for (const listing of place.listings) {
      const item = el("li");
      item.append(entryButton(listing, handlers, showPractice));
      list.append(item);
    }
    root.append(list);
  }

  const unlisted = unlistedLine(place);
  if (unlisted) {
    root.append(el("p", "shrink-0 px-0.5 text-xs text-map-muted", unlisted));
  }

  root.append(zoomButton(place, map, dismiss, "wide"));
  return root;
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/** The card's first line. Right padding clears MapLibre's close button. */
function identity(
  mark: HTMLElement,
  label: string,
  detail: HTMLElement,
): HTMLElement {
  const row = el("div", "flex shrink-0 items-center gap-2.5 pr-7");
  const text = el("div", "flex min-w-0 flex-col gap-0.5");
  text.append(
    el(
      "p",
      "truncate text-control leading-tight font-semibold tabular-nums",
      label,
    ),
    detail,
  );
  row.append(mark, text);
  return row;
}

function disc(content: Node): HTMLElement {
  const mark = el(
    "span",
    "grid size-7 shrink-0 place-items-center rounded-full bg-map-ink text-map-card",
  );
  mark.append(content);
  return mark;
}

/** A grey word and an ink value on one line (`place`: ink name, grey city). */
function twoTone(
  first: string,
  second: string,
  mode: "label" | "place" = "label",
): HTMLElement {
  const line = el("p", "truncate text-xs leading-snug");
  if (mode === "label") {
    line.append(
      el("span", "text-map-muted", `${first} `),
      el("span", "font-medium text-map-ink", second),
    );
  } else {
    line.append(
      el("span", "font-medium text-map-ink", first),
      el("span", "text-map-muted", `, ${second}`),
    );
  }
  return line;
}

function muted(text: string): HTMLElement {
  return el("p", "truncate text-xs leading-snug text-map-muted", text);
}

/**
 * One posting in a group. Click picks it (the card stays open with the row
 * marked); pointing or focusing previews it like a table row.
 */
function entryButton(
  listing: MapPlaceListing,
  { onPick, onHover }: PopupHandlers,
  showPractice: boolean,
): HTMLElement {
  const row = el(
    "button",
    "group/entry flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-map-wash aria-[current=true]:bg-map-line",
  );
  row.type = "button";
  row.dataset.listingId = listing.id;
  row.addEventListener("click", (event) => {
    if (event.detail > 1) return;
    onPick(listing);
  });
  row.addEventListener("pointerenter", () => onHover(listing.id));
  row.addEventListener("pointerleave", () => onHover(null));
  row.addEventListener("focus", () => onHover(listing.id));
  row.addEventListener("blur", () => onHover(null));

  const text = el("span", "flex min-w-0 flex-1 flex-col gap-0.5");
  text.append(
    el(
      "span",
      "line-clamp-2 text-xs leading-snug font-medium text-map-ink",
      listing.title,
    ),
  );
  const meta = el("span", "truncate text-2xs leading-snug text-map-muted");
  meta.textContent = showPractice
    ? `${listing.dateRange} · ${listing.practiceName}`
    : listing.dateRange;
  text.append(meta);

  row.append(
    text,
    icon(
      "chevron",
      "size-3.5 shrink-0 text-map-faint transition-transform group-hover/entry:translate-x-0.5 group-hover/entry:text-map-ink",
    ),
  );
  return row;
}

/* ── Actions ───────────────────────────────────────────────────────────── */

const PILL_OUTLINE =
  "flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-map-line bg-map-card text-xs font-medium text-map-ink transition-colors hover:bg-map-wash";

/**
 * The camera move — a button, since the marker's double-click is unreachable
 * from a keyboard. Dismisses the popup first, or it would ride along with the
 * camera and land on top of what the reader asked to see.
 */
function zoomButton(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  size: "icon" | "wide",
): HTMLElement {
  const label = zoomLabel(place);
  const button = el(
    "button",
    `${PILL_OUTLINE} ${size === "wide" ? "w-full px-4" : "w-8"}`,
  );
  button.type = "button";
  button.append(icon("crosshair", "size-3.5 text-map-muted"));
  if (size === "wide") {
    button.append(label);
  } else {
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  button.addEventListener("click", (event) => {
    // Otherwise MapLibre treats it as a map click.
    event.stopPropagation();
    dismiss();
    zoomToPlace(map, place);
  });

  return button;
}

/**
 * The posting's own page. A real `<a>` so modifier clicks stay the browser's;
 * a plain left-click takes the soft route.
 */
function listingLink(
  listing: MapPlaceListing,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
): HTMLElement {
  const link = el(
    "a",
    "group/open flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-map-ink px-4 text-xs font-medium text-map-card transition-opacity hover:opacity-85",
  );
  link.href = `/listings/${listing.id}`;
  link.append(
    "Voir l'annonce",
    icon(
      "arrow",
      "size-3 transition-transform group-hover/open:translate-x-0.5",
    ),
  );

  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    // A double-click navigates once, not twice.
    if (event.detail > 1) return;
    onOpen?.(listing);
  });

  return link;
}

/* ── Primitives ────────────────────────────────────────────────────────── */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The icon geometry, duplicated from `atoms/icons.tsx` because this card is
 * plain DOM. Constants only — nothing here comes from data.
 */
const GLYPHS = {
  box: '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm-9 4.5 9 4.75 9-4.75M12 12.25V21"/>',
  crosshair:
    '<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
} as const;

type Glyph = keyof typeof GLYPHS;

function icon(glyph: Glyph, className: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  svg.innerHTML = GLYPHS[glyph];
  return svg;
}
