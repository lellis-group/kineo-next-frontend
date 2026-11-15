"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 650;

/**
 * Tweens a 0-100 value towards its target, eased out. Starts at the target so
 * the server render shows the right number; honors `prefers-reduced-motion`.
 */
export function useAnimatedPercent(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      fromRef.current = target;
      setDisplayed(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    const tick = (now: number) => {
      // Clamped: a frame's `now` can predate `start`, and a negative value
      // would reach the clip rect's width, which SVG rejects.
      const t = Math.max(0, Math.min(1, (now - start) / DURATION_MS));
      const eased = 1 - (1 - t) ** 3;
      const next = t >= 1 ? target : from + (target - from) * eased;
      fromRef.current = next;
      setDisplayed(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return displayed;
}
