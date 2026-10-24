/**
 * Tests for the 2D body region picker.
 *
 * The thing worth holding still here is honesty about coverage. A picker that
 * offers nine regions while only one of them loads anything is worse than no
 * picker, so these tests pin down that the eight unmapped regions stay
 * discoverable but inert, that the one mapped region goes through the store's
 * existing `setBodyPart` path, and that a failed load says so locally instead of
 * leaving a dead control behind.
 *
 * SVG interactions use `fireEvent` rather than `userEvent`. The regions are
 * roled `<g>` elements, and jsdom's focus and pointer emulation for SVG nodes is
 * thinner than for HTML, so dispatching the events directly keeps the test
 * about the component's behaviour instead of about jsdom.
 *
 * Requirements: 1.6, 1.7, 12.6, 13.1, 13.2, 13.3
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BodyRegionPicker from './BodyRegionPicker';
import useSkeletonMapStore from '../stores/useSkeletonMapStore';
import { BODY_REGIONS } from '../models/bodySilhouette';

/** Minimal payload shaped like `public/config/foot-mapping.json`. */
const MAPPING_PAYLOAD = {
  bodyPart: 'foot',
  xrayDimensions: { width: 800, height: 600 },
  bones: [],
};

function stubFetch(response: { ok: boolean }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => MAPPING_PAYLOAD,
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function region(name: RegExp): HTMLElement {
  return screen.getByRole('button', { name });
}

beforeEach(() => {
  useSkeletonMapStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BodyRegionPicker', () => {
  it('exposes every region as a keyboard-reachable control', () => {
    render(<BodyRegionPicker />);

    const regions = screen.getAllByRole('button');
    expect(regions).toHaveLength(BODY_REGIONS.length);

    // Unavailable regions must stay in the tab order rather than being removed
    // by `disabled`, so every region carries tabindex="0".
    for (const node of regions) {
      expect(node).toHaveAttribute('tabindex', '0');
    }
  });

  it('covers the body parts the picker claims to cover', () => {
    render(<BodyRegionPicker />);

    for (const name of [
      /skull/i,
      /shoulders/i,
      /chest and ribs/i,
      /spine/i,
      /arms/i,
      /hands/i,
      /pelvis and hips/i,
      /knees/i,
      /feet/i,
    ]) {
      expect(region(name)).toBeInTheDocument();
    }
  });

  it('marks the feet available and everything else coming soon', () => {
    render(<BodyRegionPicker />);

    expect(region(/feet/i)).not.toHaveAttribute('aria-disabled');
    expect(region(/feet/i)).toHaveAccessibleName(/available/i);

    for (const name of [/skull/i, /spine/i, /knees/i, /hands/i]) {
      expect(region(name)).toHaveAttribute('aria-disabled', 'true');
      expect(region(name)).toHaveAccessibleName(/not available yet/i);
    }
  });

  it('loads the foot bone map through the store when the feet are clicked', async () => {
    const fetchMock = stubFetch({ ok: true });
    const onRegionSelected = vi.fn();

    render(<BodyRegionPicker onRegionSelected={onRegionSelected} />);
    fireEvent.click(region(/feet/i));

    await waitFor(() => expect(onRegionSelected).toHaveBeenCalledWith('foot'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'config/foot-mapping.json'
    );

    // The real store state, not a parallel loading path of our own.
    expect(useSkeletonMapStore.getState().bodyPart).toBe('foot');
    expect(useSkeletonMapStore.getState().mappingConfig).toEqual(
      MAPPING_PAYLOAD
    );
  });

  it.each([['Enter'], [' ']])(
    'activates the feet with the %s key',
    async (key) => {
      stubFetch({ ok: true });
      const onRegionSelected = vi.fn();

      render(<BodyRegionPicker onRegionSelected={onRegionSelected} />);
      fireEvent.keyDown(region(/feet/i), { key });

      await waitFor(() => expect(onRegionSelected).toHaveBeenCalledWith('foot'));
    }
  );

  it('does nothing when an unmapped region is activated', async () => {
    const fetchMock = stubFetch({ ok: true });
    const onRegionSelected = vi.fn();

    render(<BodyRegionPicker onRegionSelected={onRegionSelected} />);

    fireEvent.click(region(/spine/i));
    fireEvent.keyDown(region(/skull/i), { key: 'Enter' });

    // No request, no callback, and nothing written to the store: an unavailable
    // region is inert, not selectable-but-broken.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onRegionSelected).not.toHaveBeenCalled();
    expect(useSkeletonMapStore.getState().bodyPart).toBeNull();
    expect(useSkeletonMapStore.getState().mappingConfig).toBeNull();
  });

  it('surfaces a local error when the bone map fails to load', async () => {
    stubFetch({ ok: false });
    const onRegionSelected = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<BodyRegionPicker onRegionSelected={onRegionSelected} />);
    fireEvent.click(region(/feet/i));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to load mapping configuration/i);

    // The store reports the failure too, but the picker can be mounted outside
    // the shell that renders `errorMessage`, so it must not rely on it.
    expect(useSkeletonMapStore.getState().errorMessage).toBeTruthy();
    expect(onRegionSelected).not.toHaveBeenCalled();
  });

  it('names the active region on hover and on focus', () => {
    render(<BodyRegionPicker />);

    fireEvent.mouseEnter(region(/knees/i));
    expect(screen.getByText('Kneecap and joint surfaces')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();

    fireEvent.focus(region(/feet/i));
    expect(
      screen.getByText('Ankle, heel, midfoot and toe bones')
    ).toBeInTheDocument();
  });

  it('hides the silhouette artwork from assistive technology', () => {
    const { container } = render(<BodyRegionPicker />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('role', 'group');

    // Every path that is not inside a roled region belongs to the decorative
    // layers, which must be aria-hidden so screen reader output describes the
    // controls rather than the drawing.
    const paths = Array.from(svg?.querySelectorAll('path') ?? []);
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      const inRegion = path.closest('[role="button"]') !== null;
      const inHiddenLayer = path.closest('[aria-hidden="true"]') !== null;
      expect(inRegion || inHiddenLayer).toBe(true);
    }
  });
});
