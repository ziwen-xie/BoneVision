/**
 * Tests for the landing page.
 *
 * Four things are worth holding still here: the calls to action must put the
 * store in the right mode *and* navigate (getting one without the other drops
 * the user on the wrong screen), the document outline must stay navigable for
 * assistive tech, no bandwidth may be spent before the user asks for the
 * viewer, and the mounted region picker must keep the surface its own contrast
 * and layout work assumed.
 *
 * The picker's regions are roled `<g>` elements, so they are driven with
 * `fireEvent` rather than `userEvent` for the same reason BodyRegionPicker's
 * own tests do: jsdom's pointer and focus emulation for SVG nodes is thinner
 * than for HTML, and dispatching directly keeps the test about the component.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import useBoneVisionStore from '../stores/useBoneVisionStore';

/** Minimal payload shaped like `public/config/foot-mapping.json`. */
const MAPPING_PAYLOAD = {
  bodyPart: 'foot',
  xrayDimensions: { width: 800, height: 600 },
  bones: [],
};

/**
 * The store's actions survive `reset()`, which only clears data fields, so a
 * test that swaps one for a mock would leak it into every test after it.
 * Captured once here and re-asserted before each test instead.
 */
const REAL_ACTIONS = {
  initializeDemo: useBoneVisionStore.getState().initializeDemo,
};

/**
 * Both calls to action appear twice (hero and closing band), which is a
 * deliberate layout choice rather than an accident, so the tests reach for the
 * first match instead of asserting a single element exists.
 */
function firstButton(name: RegExp): HTMLElement {
  const [match] = screen.getAllByRole('button', { name });

  if (!match) {
    throw new Error(`No button matching ${String(name)}`);
  }

  return match;
}

/** The only request the landing page can make: the picker's bone map. */
function stubMappingFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MAPPING_PAYLOAD,
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

beforeEach(() => {
  window.location.hash = '';
  useBoneVisionStore.setState(REAL_ACTIONS);
  useBoneVisionStore.getState().reset();
});

afterEach(() => {
  window.location.hash = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LandingPage', () => {
  it('leads with the product and its value proposition', () => {
    render(<LandingPage />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/understand what your x-ray/i);

    // The brand has to be present without stealing the single h1.
    expect(screen.getAllByText('BoneVision').length).toBeGreaterThan(0);
  });

  it('keeps heading levels in order with none skipped', () => {
    render(<LandingPage />);

    const levels = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).map((heading) => Number(heading.tagName.slice(1)));

    expect(levels.length).toBeGreaterThan(1);

    let previous = 0;

    for (const level of levels) {
      if (previous === 0) {
        // The outline has to start at the top.
        expect(level).toBe(1);
      } else {
        // Going deeper is only allowed one level at a time; coming back up any
        // amount is fine.
        expect(level - previous).toBeLessThanOrEqual(1);
      }

      previous = level;
    }
  });

  it('exposes the page landmarks', () => {
    render(<LandingPage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('sends the demo action to the viewer in demo mode', async () => {
    const user = userEvent.setup();
    const initializeDemo = vi.fn().mockResolvedValue(undefined);
    useBoneVisionStore.setState({ initializeDemo });

    render(<LandingPage />);

    await user.click(firstButton(/try the demo/i));

    expect(window.location.hash).toBe('#/viewer');
    expect(useBoneVisionStore.getState().mode).toBe('demo');
  });

  it('sends the upload action to the viewer in upload mode', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.click(firstButton(/upload your x-ray/i));

    expect(window.location.hash).toBe('#/viewer');

    // `prepareUpload` ran: upload mode with the demo content cleared, so the
    // viewer opens on the drop zone rather than the sample foot.
    const state = useBoneVisionStore.getState();
    expect(state.mode).toBe('upload');
    expect(state.xrayImage).toBeNull();
    expect(state.mappingConfig).toBeNull();
  });

  it('switches back to demo mode when the demo action follows an upload', async () => {
    const user = userEvent.setup();
    const initializeDemo = vi.fn().mockResolvedValue(undefined);
    useBoneVisionStore.setState({ initializeDemo });
    useBoneVisionStore.getState().prepareUpload();

    render(<LandingPage />);

    await user.click(firstButton(/try the demo/i));

    // Coming from upload mode, the demo content genuinely has to be reloaded.
    expect(initializeDemo).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/viewer');
  });

  it('loads nothing until the user asks for the viewer', () => {
    const initializeDemo = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.fn();
    useBoneVisionStore.setState({ initializeDemo });
    vi.stubGlobal('fetch', fetchSpy);

    render(<LandingPage />);

    // The demo radiograph is ~836KB. Fetching it behind a page the visitor may
    // never leave is bandwidth spent on their behalf without being asked.
    expect(initializeDemo).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Mounting the region picker did not cost that. Its silhouette is path data
    // from a module constant and it reaches for the bone map only inside its
    // activation handler, so rendering it is free - asserted with the picker
    // demonstrably on screen, so this cannot pass by the picker being absent.
    expect(
      screen.getByRole('group', { name: /regions available/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /feet/i })).toBeInTheDocument();
  });

  it('gives every action a real control and a visible focus ring', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    const controls = [
      ...screen.getAllByRole('button'),
      ...screen.getAllByRole('link'),
    ];

    /*
      Two populations now. The page's own actions are HTML buttons and anchors,
      each carrying a Tailwind focus ring. The picker contributes roled <g>
      elements, which can take neither: an SVG path has no CSS outline and
      `focus-visible:ring-*` has nothing to paint on it, which is exactly why
      that component draws its ring as real geometry instead. Holding them to a
      class that could not apply would test the wrong thing, so they are
      partitioned and checked for what does apply to them.
    */
    const htmlControls = controls.filter((node) =>
      ['BUTTON', 'A'].includes(node.tagName)
    );
    const svgControls = controls.filter((node) => node.tagName === 'g');

    expect(htmlControls.length).toBeGreaterThan(0);
    // No third kind: every control is accounted for by one of the two rules.
    expect(htmlControls.length + svgControls.length).toBe(controls.length);

    for (const control of htmlControls) {
      expect(control.className).toMatch(/focus-visible:ring-2/);
    }

    for (const control of svgControls) {
      expect(control.closest('svg[role="group"]')).not.toBeNull();
      expect(control).toHaveAttribute('tabindex', '0');
    }

    // Keyboard reach: the first Tab from the document body has to land on a
    // control, not nowhere.
    await user.tab();
    expect(controls).toContain(document.activeElement);
  });

  it('states the coverage and the educational-only scope on the page', () => {
    render(<LandingPage />);

    // Honest coverage: one mapped foot radiograph, not whole-body support.
    expect(
      screen.getByRole('heading', { name: /mapped so far: one foot/i })
    ).toBeInTheDocument();
    // Named in the coverage card and again in the footer credit.
    expect(
      screen.getAllByText(/dorsoplantar projection/i).length
    ).toBeGreaterThan(0);

    // Scope statement, in the same terms the viewer's panel uses.
    expect(
      screen.getByRole('heading', { name: /not a diagnosis/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/talk them through with your doctor/i)
    ).toBeInTheDocument();

    // The privacy guarantee is a real property of the implementation, so it is
    // stated outright.
    expect(screen.getByText(/never uploaded to a server/i)).toBeInTheDocument();
  });

  it('marks decorative artwork as hidden from assistive tech', () => {
    render(<LandingPage />);

    const svgs = Array.from(document.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);

    for (const svg of svgs) {
      if (svg.getAttribute('role') === 'group') {
        // The one exception, and the reason this test is a branch rather than a
        // blanket assertion: the picker's silhouette is a set of controls, not
        // artwork, so hiding it would hide nine buttons. It has to be named
        // instead.
        expect(svg).toHaveAccessibleName(/regions available/i);
        expect(svg).not.toHaveAttribute('aria-hidden');
      } else {
        // Everything else is a glyph or a wordmark sitting beside text that
        // already carries the meaning.
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      }
    }
  });

  it('shows the coverage with the silhouette instead of only asserting it', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: /where the map reaches today/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/which parts of the body are mapped today/i)
    ).toBeInTheDocument();

    // One region live, the rest visible but inert - the coverage claim made
    // checkable rather than taken on trust.
    expect(screen.getByRole('button', { name: /feet/i })).toHaveAccessibleName(
      /available, select to load/i
    );
    expect(screen.getByRole('button', { name: /skull/i })).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    // And the prose the picker replaced is gone: the coverage card still names
    // the demo radiograph, but no longer states the extent of the mapping in
    // words one block above a picture of it.
    expect(
      screen.getByRole('heading', { name: /mapped so far: one foot/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/only body part with a bone map/i)
    ).not.toBeInTheDocument();
  });

  it('sends the silhouette selection into the viewer with the map loaded', async () => {
    const fetchMock = stubMappingFetch();

    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /feet/i }));

    await waitFor(() => expect(window.location.hash).toBe('#/viewer'));

    const state = useBoneVisionStore.getState();
    expect(state.bodyPart).toBe('foot');
    expect(state.mappingConfig).toEqual(MAPPING_PAYLOAD);

    // Demo mode, so the viewer's mount effect loads a radiograph for the map to
    // be drawn on instead of opening the drop zone.
    expect(state.mode).toBe('demo');

    // One small JSON, and specifically not the 836KB radiograph: the picker
    // loads the bone map, the viewer loads the image once it is asked for.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'config/foot-mapping.json'
    );
  });

  it('settles the mode when the silhouette follows an upload', async () => {
    const initializeDemo = vi.fn().mockResolvedValue(undefined);
    stubMappingFetch();
    useBoneVisionStore.setState({ initializeDemo });

    // A visitor who clicked "Upload your X-ray" and came back leaves the store
    // in upload mode.
    useBoneVisionStore.getState().prepareUpload();

    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /feet/i }));

    await waitFor(() => expect(window.location.hash).toBe('#/viewer'));

    // Navigating in upload mode would skip the viewer's demo load and show the
    // drop zone, so the map the user just picked would never appear. Switching
    // to demo mode is what prevents that - and it has to be demo, since
    // `prepareUpload` would clear the mapping the picker just fetched.
    expect(initializeDemo).toHaveBeenCalledTimes(1);
    expect(useBoneVisionStore.getState().bodyPart).toBe('foot');
  });

  it('keeps the region picker on a light surface with room to breathe', () => {
    const { container } = render(<LandingPage />);

    const svg = container.querySelector('svg[role="group"]');
    expect(svg).not.toBeNull();

    // The picker's own wrapper. `max-w-md` is 28rem, clearing the 20rem its
    // author asked for; the SVG inside is `max-w-[18rem]` and self-centering.
    const wrapper = svg?.parentElement;
    expect(wrapper?.className).toMatch(/max-w-md/);

    const ancestors: string[] = [];

    for (let node = wrapper?.parentElement; node; node = node.parentElement) {
      ancestors.push(String(node.className ?? ''));
    }

    const surfaces = ancestors.join(' ');

    /*
      Two constraints the picker's author flagged, pinned here because a later
      layout change could violate either one silently.

      Light surface: the component's contrast table is computed against white,
      and its focus indicator is a white halo under a dark stroke - the halo is
      the stroke that carries the ring over the region's dark fill, and on a
      dark band it disappears into the backdrop.
    */
    expect(surfaces).not.toMatch(
      /bg-primary-800|bg-xray-dark|bg-neutral-[89]00/
    );
    expect(ancestors[0]).toMatch(/bg-white/);

    // Width: a cell of the scope section's two-column grid is 18.25rem at the
    // 768px breakpoint, under the floor, so the picker lives outside it.
    expect(surfaces).not.toMatch(/grid-cols-2/);
  });
});
