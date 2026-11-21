"use client";

/** The profile photo picker, in the same quiet register as the other settings. */

import { useRef, useState } from "react";
import { Avatar } from "@/components/atoms/avatar";
import { Button } from "@/components/atoms/button";
import { PencilIcon, TrashIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import {
  fileErrorMessage,
  fileUrl,
  formatSize,
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  removeFile,
  uploadAvatar,
} from "@/lib/files";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import type { ApiStoredFile } from "@/lib/types/api";

export function AvatarUpload({
  initial,
  name,
}: {
  initial: ApiStoredFile | null;
  name: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(initial);
  const [pickError, setPickError] = useState("");
  const { pending, error, run } = useAsyncSubmit(fileErrorMessage);

  async function pick(files: FileList | null) {
    setPickError("");
    const chosen = files?.[0];
    if (!chosen) return;
    if (!chosen.type.startsWith("image/")) {
      setPickError("Seuls les fichiers JPEG, PNG et WebP sont acceptés.");
      return;
    }
    if (chosen.size > IMAGE_MAX_BYTES) {
      setPickError(
        `La photo doit faire moins de ${formatSize(IMAGE_MAX_BYTES)}.`,
      );
      return;
    }
    await run(async () => {
      setFile(await uploadAvatar(chosen));
      if (input.current) input.current.value = "";
    });
  }

  async function remove() {
    if (!file) return;
    await run(async () => {
      await removeFile(file.id);
      setFile(null);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar
        name={name}
        image={file ? fileUrl(file.id) : null}
        className="size-16 text-xl"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            aria-label="Choisir une photo de profil"
            onChange={(event) => void pick(event.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => input.current?.click()}
            disabled={pending}
            className="px-4 py-2"
          >
            {pending ? (
              <Spinner className="size-4 border-foreground/30 border-t-foreground" />
            ) : (
              <PencilIcon className="size-4" />
            )}
            Changer la photo
          </Button>
          {file && (
            <Button
              variant="ghost"
              onClick={() => void remove()}
              disabled={pending}
              className="px-3 py-2 text-muted"
            >
              <TrashIcon className="size-4" />
              Supprimer
            </Button>
          )}
        </div>
        <p className="text-xs text-faint">
          {file ? file.originalName : "Aucune photo enregistrée."} · JPEG, PNG
          ou WebP · {formatSize(IMAGE_MAX_BYTES)} maximum.
        </p>
        {(pickError || error) && (
          <InlineAlert as="p" tone="danger">
            {pickError || error}
          </InlineAlert>
        )}
      </div>
    </div>
  );
}
