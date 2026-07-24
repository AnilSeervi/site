/**
 * Shared mobile-breakpoint helper for canvas islands.
 *
 * The site's single responsive breakpoint is ≤768px (see the `@media`
 * blocks across the pages/components). CSS handles layout, but canvas
 * backing stores can't be sized by CSS — islands that draw to a canvas
 * must pick their pixel dimensions in JS and re-do them when the viewport
 * crosses the breakpoint (a phone rotating into landscape can exceed 768px).
 *
 * `onBreakpointChange` returns an unsubscribe fn; islands call it from
 * disconnectedCallback so the listener never outlives the element across
 * view-transition swaps.
 */

export const MOBILE_MQ = '(max-width: 768px)';

export function isMobile(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia(MOBILE_MQ).matches;
}

export function onBreakpointChange(cb: (mobile: boolean) => void): () => void {
  if (typeof matchMedia === 'undefined') return () => {};
  const mq = matchMedia(MOBILE_MQ);
  const handler = () => cb(mq.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
