/**
 * Mobile-breakpoint helper for canvas islands: backing stores can't be sized by
 * CSS, so islands re-pick pixel dimensions when the viewport crosses ≤768px
 * (a phone rotating into landscape can exceed it).
 * onBreakpointChange returns an unsubscribe — call it from disconnectedCallback
 * or the listener outlives the element across view-transition swaps.
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
