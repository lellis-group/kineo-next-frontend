"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BrowseSelection,
  ListingPageOfResult,
  ListingSpotlight,
  MapPlaceListing,
} from "@/lib/listings";

const SPOTLIGHT_MS = 1_800;

/** Announced when the picked row is already on screen. */
function pickAnnouncement(listing: BrowseSelection): string {
  const where = listing.city ? `, ${listing.city}` : "";
  return `Annonce sélectionnée : ${listing.title}${where}.`;
}

/** Announced when the pick turned the page: the pager's flash is colour alone. */
function pickMovedAnnouncement(
  listing: BrowseSelection,
  page: number,
  totalPages: number,
): string {
  return `${pickAnnouncement(listing)} Page ${page} sur ${totalPages}.`;
}

/**
 * What a pick leaves behind in the list: the glow, the waited-for page turn,
 * and the screen-reader sentence. When the row is on another page the glow is
 * armed here and lit by the effect below once the row is actually on screen.
 * It neither selects nor scrolls — those are the caller's.
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
  /** One-shot mark on the picked row, unlike the lasting selection. */
  const [spotlight, setSpotlight] = useState<ListingSpotlight | null>(null);

  const [pendingPick, setPendingPick] = useState<{
    listing: BrowseSelection;
    fromPage: number;
  } | null>(null);

  const [announcement, setAnnouncement] = useState("");

  /** Drops the glow, the pending turn and the words. */
  const clear = useCallback(() => {
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

  /**
   * Arms the after-motion for a pick. Returns whether the row is already on
   * screen — the caller's cue to scroll now.
   */
  const landPick = useCallback(
    (listing: MapPlaceListing): boolean => {
      if (onScreenIds.has(listing.id)) {
        setSpotlight((current) => ({
          id: listing.id,
          nonce: (current?.nonce ?? 0) + 1,
          fromPage: page,
        }));
        setAnnouncement(pickAnnouncement(listing));
        return true;
      }

      setPendingPick({ listing, fromPage: page });
      turnToPage(listing.id).then((result) => {
        if (result.status === "found") return;
        // A posting the filters no longer show vs. a failed lookup.
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

  // Lights a pending glow once its row is on screen.
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
