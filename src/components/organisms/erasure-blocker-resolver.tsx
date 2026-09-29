"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/atoms/card";
import { ChevronDownIcon, LayersIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ListingActions } from "@/components/organisms/listing-actions";
import { cn } from "@/lib/cn";
import {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListings,
  type MyListing,
  type ReceivedApplication,
} from "@/lib/listings";

/**
 * Inline resolution of the account-erasure blocker, shown on `/goodbye` when
 * the backend refused the confirmation with 409.
 *
 * Sending the user to `/listings/mine` and back would lose the one thing they
 * came here for: the confirmation token in the URL is the only proof of
 * identity the erasure accepts, and it is single-use. They can act on the
 * listings here, then the confirmation replays without having re-opened their
 * email — and the listings are re-read after every action so a fix made
 * elsewhere is reflected too.
 */
export function ErasureBlockerResolver({
  onResolved,
  className,
}: {
  /** Called once no listing holds an active application from another candidate. */
  onResolved: () => void;
  className?: string;
}) {
  const [listings, setListings] = useState<MyListing[] | null>(null);
  const [applicationsByListing, setApplicationsByListing] = useState<
    Record<string, ReceivedApplication[]>
  >({});
  const [expandedListingId, setExpandedListingId] = useState<string>();
  const [loadingListingId, setLoadingListingId] = useState<string>();
  const [actingListingId, setActingListingId] = useState<string>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Only a listing still holding somebody else's active application can block
  // the erasure, so the others are never shown.
  const blocking = (listings ?? []).filter(
    (listing) => listing.applicationsCount > 0,
  );
  const blockingCount = blocking.length;

  useEffect(() => {
    let cancelled = false;

    fetchMyListings()
      .then((loaded) => {
        if (!cancelled) {
          setListings(loaded.listings);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger vos annonces.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The blocker is gone: say so and replay the confirmation. Keyed on the
  // count rather than the array so a refetch that returns the same blocking
  // state does not re-fire the retry.
  useEffect(() => {
    if (listings && blockingCount === 0) {
      setSuccess(
        "Plus aucune candidature active d'un autre candidat. Suppression en cours…",
      );
      onResolved();
    }
  }, [listings, blockingCount, onResolved]);

  const handleToggle = useCallback(
    (listingId: string) => {
      setError("");

      if (expandedListingId === listingId) {
        setExpandedListingId(undefined);
        return;
      }

      setExpandedListingId(listingId);

      if (applicationsByListing[listingId]) {
        return;
      }

      setLoadingListingId(listingId);

      fetchListingApplications(listingId, { status: "PENDING" })
        .then((data) => {
          setApplicationsByListing((current) => ({
            ...current,
            [listingId]: data.applications,
          }));
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les candidatures.",
          );
        })
        .finally(() => {
          setLoadingListingId(undefined);
        });
    },
    [expandedListingId, applicationsByListing],
  );

  const runAction = useCallback(
    async (
      listingId: string,
      action: (id: string) => Promise<void>,
      label: string,
    ) => {
      setActingListingId(listingId);
      setError("");
      setSuccess("");

      try {
        await action(listingId);

        // Re-read rather than patch: `close` and `cancel` both terminate the
        // applications server-side, and the recalculated count is the
        // authoritative one.
        const refreshed = await fetchMyListings();
        setListings(refreshed.listings);
        setApplicationsByListing({});
        setSuccess(
          `${label} Les candidatures qu'elle recevait sont terminées.`,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "L'opération a échoué. Veuillez réessayer.",
        );
      } finally {
        setActingListingId(undefined);
      }
    },
    [],
  );

  if (success) {
    return (
      <InlineAlert tone="success" className={className}>
        {success}
      </InlineAlert>
    );
  }

  if (!listings) {
    return (
      <div className={className}>
        <div className="flex justify-center py-4">
          <output aria-label="Chargement de vos annonces">
            <Spinner className="h-6 w-6 border-primary/20 border-t-primary" />
          </output>
        </div>
      </div>
    );
  }

  if (blockingCount === 0) {
    return null;
  }

  return (
    <div className={className}>
      {error && (
        <InlineAlert as="p" tone="danger" className="mb-4">
          {error}
        </InlineAlert>
      )}

      <p className="text-left text-sm leading-relaxed text-muted">
        Fermer ou annuler une annonce termine automatiquement les candidatures
        qu&apos;elle recevait. Voici les annonces à traiter :
      </p>

      <ul className="mt-4 space-y-3 text-left">
        {blocking.map((listing) => (
          <li key={listing.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"
                  >
                    <LayersIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold break-words text-foreground">
                      {listing.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {listing.applicationsCount} candidature
                      {listing.applicationsCount > 1 ? "s" : ""} en cours
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(listing.id)}
                  aria-expanded={expandedListingId === listing.id}
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted transition-colors hover:text-primary"
                >
                  {expandedListingId === listing.id
                    ? "Masquer"
                    : "Voir les candidats"}
                  <ChevronDownIcon
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      expandedListingId === listing.id && "rotate-180",
                    )}
                  />
                </button>
              </div>

              {expandedListingId === listing.id && (
                <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                  {loadingListingId === listing.id && (
                    <li className="text-xs text-muted">Chargement…</li>
                  )}
                  {(applicationsByListing[listing.id] ?? []).map(
                    (application) => (
                      <li key={application.id} className="text-xs text-muted">
                        {application.applicant.displayName}
                      </li>
                    ),
                  )}
                </ul>
              )}

              <div className="mt-4 border-t border-border pt-4">
                <ListingActions
                  activeCount={listing.applicationsCount}
                  acting={actingListingId === listing.id}
                  onClose={() =>
                    runAction(listing.id, closeListing, "Annonce clôturée.")
                  }
                  onCancel={() =>
                    runAction(listing.id, cancelListing, "Annonce annulée.")
                  }
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
