/** Whether an element is at all inside the viewport. */
export function isInView(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  return box.bottom > 0 && box.top < window.innerHeight;
}
