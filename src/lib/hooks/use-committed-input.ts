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
 */
export function useCommittedInput(committed: string) {
  const [draft, setDraft] = useState(committed);
  const committedRef = useRef(committed);
  committedRef.current = committed;

  useEffect(() => setDraft(committed), [committed]);

  /** Reports the draft if it differs from what is already applied. */
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== committedRef.current) {
      return trimmed;
    }
    return null;
  };

  return { draft, setDraft, commit };
}
