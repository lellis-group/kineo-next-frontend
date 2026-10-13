/**
 * Whether an element is at all inside the viewport.
 *
 * Does not touch the layout, only reads it: a single `getBoundingClientRect`,
 * which is why it is safe inside an event-driven card click.
 */
export function isInView(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  return box.bottom > 0 && box.top < window.innerHeight;
}
