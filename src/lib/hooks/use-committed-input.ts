"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A text field that reports a value only when the reader is done with it.
 *
 * Lifting on every keystroke would fire one request per character. Not lifting
 * at all would make the field a dead end, since a bar with no form around it has
 * no submit to hook onto. So the draft is local and the committed value comes
 * back down as a prop.
 *
 * Syncing from the prop is what makes it correct when the value is changed from
 * elsewhere — a « Réinitialiser » must clear the box too, or the reader sees an
 * empty result set with a city still typed into it. The sync writes straight to
 * the draft rather than through `commit`, because a value the parent already
 * holds is not a change to report back.
 *
 * The sync is conditional (see `shouldAdoptCommitted`): it must not adopt the
 * echo of the field's own commit. A commit writes the URL and the new committed
 * value only arrives after the navigation lands, so between the two the draft
 * may already hold newer keystrokes the echo would clobber.
 */
export function useCommittedInput(committed: string) {
  const [draft, setDraft] = useState(committed);
  const committedRef = useRef(committed);
  committedRef.current = committed;
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (shouldAdoptCommitted(committed, lastSentRef.current)) {
      lastSentRef.current = null;
      setDraft(committed);
    }
  }, [committed]);

  /** Reports the draft if it differs from what is already applied. */
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== committedRef.current) {
      lastSentRef.current = trimmed;
      return trimmed;
    }
    return null;
  };

  return { draft, setDraft, commit };
}

/**
 * A text field that applies a value a moment after the reader stops typing.
 *
 * The live counterpart of `useCommittedInput`. A search box wants to answer as
 * the reader types, not only on blur — but applying every keystroke would fire a
 * read per character, and on the browse feed each apply writes the URL and
 * re-reads every endpoint. So the draft is local (the input stays instant) and
 * the value is reported only after `delay` of quiet, which collapses a burst of
 * typing into one apply.
 *
 * Syncing from the prop, like `useCommittedInput`, keeps the field correct when
 * the value changes from elsewhere — a « Réinitialiser », or the back button
 * walking to another view. The commit is skipped when the draft already equals
 * what is applied, so that sync does not echo straight back as an apply.
 *
 * The callbacks are read through refs for the same reason the paginated hook
 * does it: `onCommit` is rebuilt whenever the filters change, and a fresh
 * identity must not restart the timer mid-burst.
 */
export function useDebouncedInput(
  committed: string,
  onCommit: (value: string) => void,
  delay = 300,
) {
  const [draft, setDraft] = useState(committed);
  const committedRef = useRef(committed);
  committedRef.current = committed;
  const lastSentRef = useRef<string | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // An external change — reset, or the back button — becomes the new draft.
  // The echo of this field's own commit is not external: the navigation lands
  // after the reader may already have typed past the value it carries, and
  // adopting it would clobber those newer keystrokes. The timer guard below
  // re-commits the surviving draft, so nothing the reader typed is lost.
  useEffect(() => {
    if (shouldAdoptCommitted(committed, lastSentRef.current)) {
      lastSentRef.current = null;
      setDraft(committed);
    }
  }, [committed]);

  useEffect(() => {
    // Nothing typed since the last apply: no timer, no apply.
    if (draft === committedRef.current) return;
    const timer = setTimeout(() => {
      const trimmed = draft.trim();
      if (trimmed !== committedRef.current) {
        lastSentRef.current = trimmed;
        onCommitRef.current(trimmed);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, delay]);

  return { draft, setDraft };
}

/**
 * Whether an arriving committed value should replace the draft.
 *
 * A commit writes the URL and the new committed value only lands after the
 * navigation — so a `committed` that equals what this field last sent is the
 * echo of its own commit, not news from elsewhere, and the draft (which may
 * already hold newer keystrokes) wins. Anything else is external — a reset, or
 * the back button walking to another view — and becomes the new draft.
 *
 * A pure function so the rule is testable without a DOM: the hooks own the
 * refs, this owns the decision.
 */
export function shouldAdoptCommitted(
  committed: string,
  lastSent: string | null,
): boolean {
  return committed !== lastSent;
}
