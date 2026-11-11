"use client";

import { useRef } from "react";

/**
 * A ref that always holds the value from the latest render.
 *
 * For callbacks and state read from inside DOM or MapLibre listeners: listing
 * them as effect dependencies would tear the listeners down and bind them again
 * every time the parent hands over a new function identity, which on the browse
 * screen means on every row hover. The listener reads `.current` when it fires
 * and gets whatever is current then.
 *
 * Written during render on purpose, as the copies it replaces were: a listener
 * firing between a render and its effects must not see the previous callback.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
