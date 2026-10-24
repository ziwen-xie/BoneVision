/**
 * useHashRoute
 *
 * The whole router. Two screens - the marketing landing page and the viewer -
 * so this is a parser plus a subscription, not a routing library.
 *
 * Why the hash and not the path
 * -----------------------------
 * The site is deployed to GitHub Pages under https://<user>.github.io/BoneVision/.
 * Pages serves static files only: a request for `/BoneVision/viewer` is a 404
 * because no such file exists, and the usual workaround is to ship a 404.html
 * that re-serves index.html and replays the intended path from `sessionStorage`.
 * That trick costs a real HTTP 404 on every deep link, confuses crawlers, and
 * breaks the back button in subtle ways. Everything after `#` is never sent to
 * the server, so hash routes deep-link correctly on Pages with no rewrite layer
 * at all - `.../BoneVision/#/viewer` is a plain request for index.html.
 *
 * The trade-off is cosmetic (a `#` in shared URLs) and the fragment is still a
 * first-class part of the URL: copyable, bookmarkable, and restored on reload.
 *
 * _Requirements: 9.5_
 */

import { useSyncExternalStore } from 'react';

/** Every screen the app can be on. Unknown fragments resolve to `landing`. */
export type Route = 'landing' | 'viewer';

/** Canonical fragment for each route, used when navigating programmatically. */
const ROUTE_HASH: Record<Route, string> = {
  landing: '#/',
  viewer: '#/viewer',
};

/**
 * Path portion of a fragment -> route. Only the viewer needs an entry; the
 * landing page is the fallback, so a stale or hand-edited link lands somewhere
 * useful instead of on a blank screen.
 */
const ROUTE_BY_PATH: Record<string, Route> = {
  viewer: 'viewer',
};

/**
 * Read a route out of a raw `location.hash`.
 *
 * Tolerant on purpose, because fragments arrive from everywhere - typed by
 * hand, pasted from chat with a trailing slash, produced by an old link, or
 * absent entirely on the bare domain. Normalises the `#`/`#!` prefix, an
 * optional leading and trailing `/`, case, and any `?query` the fragment picked
 * up, then resolves what is left. Exported so the mapping can be tested
 * without a DOM.
 */
export function parseHashRoute(hash: string): Route {
  const path = hash
    .replace(/^#!?\/?/, '') // '#/viewer' | '#!/viewer' | '#viewer' -> 'viewer'
    .replace(/[?#].*$/, '') // drop a fragment-local query string
    .replace(/\/+$/, '') // '#/viewer/' -> 'viewer'
    .trim()
    .toLowerCase();

  return ROUTE_BY_PATH[path] ?? 'landing';
}

/**
 * Go to a route.
 *
 * Writing to `location.hash` rather than calling `history.pushState` keeps the
 * browser in charge: it pushes the history entry, fires `hashchange`, and makes
 * Back return to the previous screen for free. Assigning the hash the page is
 * already on is a no-op in every browser, so a repeated click cannot stack up
 * duplicate history entries.
 */
export function navigateToRoute(route: Route): void {
  window.location.hash = ROUTE_HASH[route];
}

/** `hashchange` is the only thing that can change the answer. */
function subscribe(onRouteChange: () => void): () => void {
  window.addEventListener('hashchange', onRouteChange);
  return () => window.removeEventListener('hashchange', onRouteChange);
}

function getSnapshot(): Route {
  return parseHashRoute(window.location.hash);
}

/** No DOM when prerendering, so nothing can be on the viewer route yet. */
function getServerSnapshot(): Route {
  return 'landing';
}

/**
 * The active route, re-read whenever the fragment changes.
 *
 * `useSyncExternalStore` instead of `useState` + an effect: the first render
 * already sees the real fragment, so a deep link to `#/viewer` paints the
 * viewer directly instead of flashing the landing page for one frame. The
 * snapshot is a string, so the referential-stability requirement is satisfied
 * without memoisation.
 */
export default function useHashRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
