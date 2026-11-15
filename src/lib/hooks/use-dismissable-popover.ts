"use client";

import { type RefObject, useEffect } from "react";

/**
 * Closes a popover on an outside pointer or Escape. Escape also returns focus
 * to the trigger, so the next Tab resumes from there.
 */
export function useDismissablePopover({
  open,
  setOpen,
  rootRef,
  triggerRef,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef?.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef, setOpen, triggerRef]);
}
