"use client";

/**
 * The owner's photo panel of one listing: a quiet drop-in area, a thumbnail
 * grid and a delete control per photo. Writes go through the file service;
 * the backend keeps the authority on type, size and count.
 */

import { useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { PlusIcon, TrashIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { PhotoStrip } from "@/components/molecules/photo-strip";
import {
  fileErrorMessage,
  fileUrl,
  formatSize,
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  LISTING_IMAGES_MAX,
  removeFile,
  uploadListingImages,
} from "@/lib/files";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import type { ApiStoredFile } from "@/lib/types/api";

export function PhotoUpload({
  listingId,
  initialPhotos,
}: {
  listingId: string;
  initialPhotos: ApiStoredFile[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [selected, setSelected] = useState<File[]>([]);
  const [pickError, setPickError] = useState("");
  const { pending, error, run } = useAsyncSubmit(fileErrorMessage);

  const remaining = LISTING_IMAGES_MAX - photos.length;

  function pick(files: FileList | null) {
    setPickError("");
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);
    const tooMany = chosen.length > remaining;
    const tooLarge = chosen.some((file) => file.size > IMAGE_MAX_BYTES);
    const wrongType = chosen.some((file) => !file.type.startsWith("image/"));
    if (tooMany || tooLarge || wrongType) {
      setPickError(
        tooMany
          ? `Vous pouvez ajouter au plus ${remaining} photo${remaining > 1 ? "s" : ""} à cette annonce.`
          : tooLarge
            ? `Chaque photo doit faire moins de ${formatSize(IMAGE_MAX_BYTES)}.`
            : "Seuls les fichiers JPEG, PNG et WebP sont acceptés.",
      );
      return;
    }
    setSelected(chosen);
  }

  async function add() {
    const saved = await run(async () => {
      setPickError("");
      const created = await uploadListingImages(listingId, selected);
      setPhotos((current) => [...current, ...created]);
      setSelected([]);
      if (input.current) input.current.value = "";
    });
    return saved;
  }

  async function remove(id: string) {
    await run(async () => {
      await removeFile(id);
      setPhotos((current) => current.filter((photo) => photo.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PhotoStrip
        photos={photos.map((photo) => ({
          id: photo.id,
          url: fileUrl(photo.id),
          originalName: photo.originalName,
        }))}
        emptyLabel="Aucune photo pour le moment."
      />

      {photos.length > 0 && (
        <ul className="flex flex-col gap-1">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex items-center justify-between gap-3 text-xs text-muted"
            >
              <span className="min-w-0 truncate">{photo.originalName}</span>
              <button
                type="button"
                onClick={() => void remove(photo.id)}
                disabled={pending}
                aria-label={`Supprimer ${photo.originalName}`}
                className="shrink-0 rounded-control p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
              >
                <TrashIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-muted">
          {selected.map((file) => file.name).join(", ")} ·{" "}
          {formatSize(selected.reduce((total, file) => total + file.size, 0))}
        </p>
      )}

      {(pickError || error) && (
        <InlineAlert as="p" tone="danger">
          {pickError || error}
        </InlineAlert>
      )}

      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        aria-label="Choisir des photos"
        onChange={(event) => pick(event.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => input.current?.click()}
          disabled={pending || remaining === 0}
          className="px-4 py-2"
        >
          <PlusIcon className="size-4" />
          Choisir des photos
        </Button>
        {selected.length > 0 && (
          <PendingButton
            pending={pending}
            idleLabel="Ajouter"
            pendingLabel="Ajout…"
            onClick={() => void add()}
            className="px-4 py-2"
          />
        )}
      </div>
      <p className="text-xs text-faint">
        JPEG, PNG ou WebP · jusqu&apos;à {LISTING_IMAGES_MAX} photos ·{" "}
        {formatSize(IMAGE_MAX_BYTES)} par fichier.
      </p>
    </div>
  );
}
