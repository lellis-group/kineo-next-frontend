"use client";

/** The reusable CV picker. The application keeps its own immutable snapshot. */

import { useRef, useState } from "react";
import { Button } from "@/components/atoms/button";
import { FileTextIcon, TrashIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import {
  CV_ACCEPT,
  CV_MAX_BYTES,
  fileErrorMessage,
  formatSize,
  removeFile,
  uploadProfileCv,
} from "@/lib/files";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import type { ApiStoredFile } from "@/lib/types/api";

export function CvUpload({ initial }: { initial: ApiStoredFile | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(initial);
  const [pickError, setPickError] = useState("");
  const { pending, error, run } = useAsyncSubmit(fileErrorMessage);

  async function pick(files: FileList | null) {
    setPickError("");
    const chosen = files?.[0];
    if (!chosen) return;
    if (chosen.type !== "application/pdf" && !chosen.name.endsWith(".pdf")) {
      setPickError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (chosen.size > CV_MAX_BYTES) {
      setPickError(`Le CV doit faire moins de ${formatSize(CV_MAX_BYTES)}.`);
      return;
    }
    await run(async () => {
      setFile(await uploadProfileCv(chosen));
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
      <span className="icon-tilt grid size-10 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
        <FileTextIcon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-foreground">
          {file ? file.originalName : "Aucun CV enregistré."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept={CV_ACCEPT}
            className="hidden"
            aria-label="Choisir un CV"
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
            ) : null}
            {file ? "Remplacer le CV" : "Ajouter un CV"}
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
          PDF uniquement · {formatSize(CV_MAX_BYTES)} maximum. Le CV envoyé à un
          cabinet reste figé au moment de la candidature.
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
