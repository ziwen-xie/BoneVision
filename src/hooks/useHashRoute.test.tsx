/**
 * Tests for the hash router.
 *
 * Two concerns: the fragment -> route mapping has to be forgiving of the shapes
 * a shared URL actually arrives in, and the hook has to re-render when the
 * fragment changes under it (the back button, a plain `<a href="#/viewer">`, or
 * `navigateToRoute`).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import useHashRoute, {
  navigateToRoute,
  parseHashRoute,
  type Route,
} from './useHashRoute';

/** Put the fragment back so one test cannot steer the next one. */
function resetHash() {
  window.location.hash = '';
}

beforeEach(resetHash);
afterEach(resetHash);

describe('parseHashRoute', () => {
  it('routes the canonical fragments', () => {
    expect(parseHashRoute('#/')).toBe('landing');
    expect(parseHashRoute('#/viewer')).toBe('viewer');
  });

  it('treats an absent fragment as the landing page', () => {
    // The bare deployed URL has no fragment at all, and `location.hash` is ''.
    expect(parseHashRoute('')).toBe('landing');
    expect(parseHashRoute('#')).toBe('landing');
  });

  it('tolerates the shapes a pasted link arrives in', () => {
    const variants = [
      '#/viewer/', // trailing slash
      '#viewer', // missing slash
      '#!/viewer', // legacy hashbang
      '#/Viewer', // capitalised
      '#/viewer?from=email', // fragment-local query string
    ];

    for (const variant of variants) {
      expect(parseHashRoute(variant)).toBe('viewer');
    }
  });

  it('falls back to the landing page for anything unrecognised', () => {
    // A stale or hand-edited link must land somewhere useful, not on a blank
    // screen.
    expect(parseHashRoute('#/upload')).toBe('landing');
    expect(parseHashRoute('#/viewer/foot/navicular')).toBe('landing');
    expect(parseHashRoute('#section-3')).toBe('landing');
  });
});

describe('useHashRoute', () => {
  it('reads the route on the very first render', () => {
    // No flash of the landing page before an effect catches up: a deep link has
    // to paint the viewer immediately.
    window.location.hash = '#/viewer';

    const { result } = renderHook(() => useHashRoute());

    expect(result.current).toBe('viewer');
  });

  it('defaults to the landing page with no fragment', () => {
    const { result } = renderHook(() => useHashRoute());

    expect(result.current).toBe('landing');
  });

  it('re-renders when the fragment changes', async () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe('landing');

    act(() => {
      window.location.hash = '#/viewer';
    });

    await waitFor(() => expect(result.current).toBe('viewer'));
  });

  it('follows navigateToRoute in both directions', async () => {
    const { result } = renderHook(() => useHashRoute());

    act(() => navigateToRoute('viewer'));
    await waitFor(() => expect(result.current).toBe('viewer'));
    expect(window.location.hash).toBe('#/viewer');

    act(() => navigateToRoute('landing'));
    await waitFor(() => expect(result.current).toBe('landing'));
    expect(window.location.hash).toBe('#/');
  });

  it('stops listening once unmounted', async () => {
    const { result, unmount } = renderHook(() => useHashRoute());
    const lastRoute: Route = result.current;

    unmount();

    act(() => {
      window.location.hash = '#/viewer';
    });

    // Nothing to assert on the DOM; the point is that the fragment change does
    // not reach a torn-down hook and warn or throw.
    await waitFor(() => expect(window.location.hash).toBe('#/viewer'));
    expect(lastRoute).toBe('landing');
  });
});
