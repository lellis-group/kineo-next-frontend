/**
 * List slimming — the payload diet for the two heavy list reads.
 *
 * Two list endpoints ship fields their cards never render, on every row of
 * every page: `GET /applications/mine` embeds each listing with its full
 * `practice` (address, coordinates — the card only shows « name · city ») and
 * its `description` (only the detail page renders it), plus the candidate's
 * `message` in full while the card clamps it to 2-3 lines. `GET
 * /replacement-listings/mine` ships the same `description` the board never
 * shows (title, period, status, specialty, counts are what the rows render).
 *
 * The backend owns the rows, so the true fix lives there; this module is the
 * frontend-side equivalent, applied in the Next proxy — the one place that
 * sees the wire before anyone adapts or renders it. Detail reads pass through
 * untouched, so the full text stays one click away. The transform is
 * shape-preserving (same envelope, same keys, narrowed values), so adapters
 * keep working unchanged.
 */

/** Preview length for a candidate message on a list row (~2-3 lines shown). */
export const LIST_MESSAGE_PREVIEW_CHARS = 200;

export function truncatePreview(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= LIST_MESSAGE_PREVIEW_CHARS) return trimmed;
  const cut = trimmed.slice(0, LIST_MESSAGE_PREVIEW_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  const preview = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${preview}…`;
}

/** Keeps id/name/city — the « name · city » line — drops address/coords. */
export function slimEmbeddedPractice(
  practice: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!practice || typeof practice !== "object") return practice;
  const slim: Record<string, unknown> = {};
  if ("id" in practice) slim.id = practice.id;
  if ("name" in practice) slim.name = practice.name;
  if ("city" in practice) slim.city = practice.city;
  return slim;
}

/** One row of `GET /applications/mine`, slimmed for the list card. */
export function slimMineApplication(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const slim: Record<string, unknown> = { ...row };
  if (typeof slim.message === "string") {
    slim.message = truncatePreview(slim.message);
  }
  const listing = slim.listing;
  if (listing && typeof listing === "object") {
    const embedded = listing as Record<string, unknown>;
    const slimListing: Record<string, unknown> = { ...embedded };
    delete slimListing.description;
    slimListing.practice = slimEmbeddedPractice(
      embedded.practice as Record<string, unknown> | undefined,
    );
    slim.listing = slimListing;
  }
  return slim;
}

/** One row of `GET /replacement-listings/mine`, slimmed for the board. */
export function slimMineListing(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const slim: Record<string, unknown> = { ...row };
  delete slim.description;
  return slim;
}

/** Which slimming a backend path wants, or null to stream untouched. */
export function slimForTarget(
  target: string,
): ((row: Record<string, unknown>) => Record<string, unknown>) | null {
  if (target === "/applications/mine") return slimMineApplication;
  if (target === "/replacement-listings/mine") return slimMineListing;
  return null;
}

function slimRows(
  rows: unknown,
  slim: (row: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) =>
    row && typeof row === "object" ? slim(row as Record<string, unknown>) : row,
  );
}

/**
 * Slims a parsed list body, preserving its shape (bare array or
 * `{ data, meta }` envelope with pagination/totals untouched). Returns null
 * when the body is neither, so an unknown shape falls back to streaming.
 */
export function slimListPayload(
  raw: unknown,
  slim: (row: Record<string, unknown>) => Record<string, unknown>,
): unknown | null {
  if (Array.isArray(raw)) return slimRows(raw, slim);
  if (raw && typeof raw === "object" && "data" in raw && "meta" in raw) {
    const envelope = raw as { data: unknown; meta: unknown };
    return { ...envelope, data: slimRows(envelope.data, slim) };
  }
  return null;
}
