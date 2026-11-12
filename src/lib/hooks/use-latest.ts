"use client";

import { useRef } from "react";

/**
 * A ref holding the value from the latest render, for listeners that must not
 * be rebound on every new callback identity. Written during render so a
 * listener firing before effects still sees the new value.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
