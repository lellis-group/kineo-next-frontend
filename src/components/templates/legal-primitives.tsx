import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/atoms/icons";

/**
 * The prose vocabulary the long-form legal documents are written in.
 *
 * These six were private to `app/(site)/privacy/page.tsx`, which meant the terms
 * page — the other document, in the same language, on the same screen — rewrote
 * three of them inline instead. Two paragraphs written a few lines apart ended
 * up on two different measures, and the bullet rows drifted: `mt-2 h-1 w-1` in
 * one, `mt-1.5 h-1.5 w-1.5` in the other, for the same list.
 *
 * They are here rather than in `legal-document.tsx` because that file is the
 * shell — the title, the logo, the back link — and these are the body. A document
 * that used only a `Paragraph` should not have to read the sidebar's code to find
 * out how wide a paragraph is.
 */

/**
 * Paragraph measure: ~70 characters, where French prose reads comfortably.
 *
 * One value, because the two legal pages had each invented their own and the
 * difference showed as a visible seam when a reader went from one to the other.
 */
export const LEGAL_PROSE = "max-w-[70ch] text-[0.925rem] leading-relaxed";

/** A numbered section, anchored so the sidebar's links land on it. */
export function Section({
  id,
  index,
  title,
  children,
}: {
  /** Anchor id — shared with the sidebar, which links to `#id`. */
  id: string;
  /** 1-based position, shown in the heading and in the sidebar. */
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        <span className="text-faint">{index}.</span> {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** A heading inside a section. */
export function Subheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-bold tracking-tight text-foreground">
      {children}
    </h3>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <p className={LEGAL_PROSE}>{children}</p>;
}

/** Unordered list with the project's square bullet. */
export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className={`${LEGAL_PROSE} list-none space-y-2.5`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
          />
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered procedure — used for the erasure timeline. */
export function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className={`${LEGAL_PROSE} list-none space-y-3`}>
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
          >
            {index + 1}
          </span>
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** A note pinned to a section the legal team has still to settle. */
export function PendingNote({ children }: { children: ReactNode }) {
  return (
    <p
      className={`${LEGAL_PROSE} border-l-2 border-warning/40 pl-4 text-sm text-muted`}
    >
      {children}
    </p>
  );
}

/**
 * The collapsible summary of everything still awaiting legal validation.
 *
 * Collected once at the top rather than as a badge interrupting each pending
 * section: a notice that invents those facts is worse than one that admits it is
 * incomplete, so the open items are named — and naming them in one place is what
 * makes the count meaningful.
 */
export function PendingCallout({ items }: { items: readonly string[] }) {
  return (
    <details className="group mt-8 rounded-2xl border border-warning/25 bg-warning/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold text-warning marker:content-none">
        <span>En attente de validation juridique ({items.length} points)</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="space-y-2 border-t border-warning/20 px-5 py-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-muted">
            <span
              aria-hidden="true"
              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning/60"
            />
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}
