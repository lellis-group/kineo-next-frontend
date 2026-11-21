import Image from "next/image";
import { cn } from "@/lib/cn";

export interface PhotoView {
  id: string;
  url: string;
  originalName: string;
}

/**
 * A quiet grid of listing photos. `unoptimized` is required: the stream route
 * reads the session cookie, and Next's optimizer never forwards headers.
 */
export function PhotoStrip({
  photos,
  emptyLabel,
  className,
}: {
  photos: readonly PhotoView[];
  emptyLabel: string;
  className?: string;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="relative aspect-[4/3] overflow-hidden rounded-control border border-border bg-surface-2"
        >
          <Image
            src={photo.url}
            alt={photo.originalName}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
