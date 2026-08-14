/**
 * One in-flight request per URL, shared by every island that asks for it.
 *
 * The home page mounts <as-ticker> and <as-home-data> together and both want
 * /api/github, so it was fetched twice per load. HTTP caching cannot help here:
 * both requests start in the same tick, before either response exists.
 *
 * Only the in-flight promise is shared. The entry is dropped once it settles,
 * so a later call — a soft navigation back to the page, say — refetches instead
 * of reading a memo that has gone stale. Islands stay independent: whichever
 * mounts first opens the request, the rest join it, and each still handles its
 * own failure.
 */
const inflight = new Map<string, Promise<unknown>>();

/** Rejects on a non-2xx, matching what a caller doing `fetch` + `res.ok` expects. */
export function feed<T = Record<string, unknown>>(url: string): Promise<T> {
  const pending = inflight.get(url) as Promise<T> | undefined;
  if (pending) return pending;

  const request = fetch(url).then((res) => {
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<T>;
  });

  inflight.set(url, request);
  // drop the entry without handing callers a different promise. This also
  // consumes the rejection, so a failure no one else awaited stays quiet.
  request.then(
    () => inflight.delete(url),
    () => inflight.delete(url)
  );

  return request;
}
