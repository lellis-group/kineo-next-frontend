"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BrowseSelection,
  ListingPageOfResult,
  ListingSpotlight,
  MapPlaceListing,
} from "@/lib/listings";

/** How long the pick's glow lasts before the screen lets it go. */
const SPOTLIGHT_MS = 1_800;

/**
 * What a screen reader hears when the picked row is already on screen.
 *
 * The visual answer to « what changed » is the row's own glow; this is the same
 * answer in words, and it never mentions the pager, because the pager did not
 * move.
 */
function pickAnnouncement(listing: BrowseSelection): string {
  const where = listing.city ? `, ${listing.city}` : "";
  return `Annonce sélectionnée : ${listing.title}${where}.`;
}

/**
 * Same, for the pick that turned the list.
 *
 * The pager's flash is colour alone, so the turn is named here — this is the
 * only place the reader is told which page they were brought to.
 */
function pickMovedAnnouncement(
  listing: BrowseSelection,
  page: number,
  totalPages: number,
): string {
  return `${pickAnnouncement(listing)} Page ${page} sur ${totalPages}.`;
}

/**
 * What a pick leaves behind it in the list: the glow, the waited-for page turn,
 * and the sentence a screen reader hears.
 *
 * Two moments, and they cannot share one code path. When the row is already on
 * screen the glow can start at the click and name it; when the row is on
 * another page the glow must not start at all — at that moment there is no row
 * under the reader — so it is armed here and lit by the effect below, once the
 * turn has landed and `onScreenIds` actually holds the id.
 *
 * The machine is only the *after-motion* of a pick rather than the pick
 * itself: it neither selects (the caller owns the choice) nor scrolls (the
 * scroll a pick asks for is the list's own `scrollTo`, handed back as the
 * boolean `landPick` answers with).
 */
export function usePickLanding({
  page,
  totalPages,
  onScreenIds,
  turnToPage,
}: {
  page: number;
  totalPages: number;
  onScreenIds: Set<string>;
  turnToPage: (id: string) => Promise<ListingPageOfResult>;
}) {
  /**
   * The one-shot mark a pick leaves on its row. Not the selection: the
   * selection lasts until dismissed, this lasts about two seconds.
   */
  const [spotlight, setSpotlight] = useState<ListingSpotlight | null>(null);

  /**
   * A pick whose row is on another page, waiting for the turn to land. The glow
   * must not start at the click: at that moment the row is not in the DOM.
   */
  const [pendingPick, setPendingPick] = useState<{
    listing: BrowseSelection;
    fromPage: number;
  } | null>(null);

  /** What a screen reader hears after a pick — the visual glow in words. */
  const [announcement, setAnnouncement] = useState("");

  /**
   * Drops the whole after-motion — the glow, the pending turn, the words.
   *
   * Two callers, and the difference between them is the selection alone: a page
   * turn keeps the choice and drops only this, while dropping the choice takes
   * the glow with it — a mark whose subject has been unchosen is a lie.
   */
  const clear = useCallback(() => {
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

  /**
   * Arms the after-motion for a pick — at the click, both glow and words are
   * the landing's to place.
   *
   * Returns whether the row is already on screen: `true` is the caller's cue to
   * scroll to the row *now*, because the scroll a pick asks for is the list's
   * own business; `false` means the page turn is on its way and the effect
   * below owns the rest.
   */
  const landPick = useCallback(
    (listing: MapPlaceListing): boolean => {
      if (onScreenIds.has(listing.id)) {
        // The row is already here: the glow can start now, and say which page
        // the pick left the reader on (its own — so nothing about the pager).
        setSpotlight((current) => ({
          id: listing.id,
          nonce: (current?.nonce ?? 0) + 1,
          fromPage: page,
        }));
        setAnnouncement(pickAnnouncement(listing));
        return true;
      }

      /*
        The row is on another page. The glow must not start at the click — at
        that moment there is no row under the reader — so it is armed here and
        lit by the effect below, once the turn has landed and `onScreenIds`
        actually holds the id.
      */
      setPendingPick({ listing, fromPage: page });
      turnToPage(listing.id).then((result) => {
        if (result.status === "found") return;
        // Stand down rather than leave a glow armed against a row that is not
        // coming. The two failures are not the same sentence: a posting the
        // filters no longer show is gone, while a failed lookup is the
        // connection, and the reader can try again.
        setPendingPick(null);
        setAnnouncement(
          result.status === "missing"
            ? `Annonce introuvable : ${listing.title}.`
            : `Impossible de localiser l'annonce : ${listing.title}. Réessayez.`,
        );
      });
      return false;
    },
    [page, onScreenIds, turnToPage],
  );

  /*
    Places a pending glow the moment its row is really on screen.

    The page that turned to reach the row is part of the sentence, because the
    visual signal for that turn is colour alone — and the pager's flash only
    says *that* something changed, not what.
  */
  useEffect(() => {
    if (!pendingPick) return;
    if (!onScreenIds.has(pendingPick.listing.id)) return;

    const turned = page !== pendingPick.fromPage;
    setSpotlight((current) => ({
      id: pendingPick.listing.id,
      nonce: (current?.nonce ?? 0) + 1,
      fromPage: pendingPick.fromPage,
    }));
    setAnnouncement(
      turned
        ? pickMovedAnnouncement(pendingPick.listing, page, totalPages)
        : pickAnnouncement(pendingPick.listing),
    );
    setPendingPick(null);
  }, [pendingPick, onScreenIds, page, totalPages]);

  /**
   * Ends the glow. Without this timer the halo would stay lit until the next
   * pick, and a second reader would read the glow as live state rather than as
   * the aftermath of a click that has already settled.
   */
  useEffect(() => {
    if (!spotlight) return;
    const timer = window.setTimeout(() => setSpotlight(null), SPOTLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [spotlight]);

  return useMemo(
    () => ({ spotlight, announcement, landPick, clear }),
    [spotlight, announcement, landPick, clear],
  );
}
