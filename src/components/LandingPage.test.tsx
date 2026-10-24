/**
 * Tests for the landing page.
 *
 * Five things are worth holding still here: the calls to action must put the
 * store in the right mode *and* navigate (getting one without the other drops
 * the user on the wrong screen), the document outline must stay navigable for
 * assistive tech, no bandwidth may be spent before the user asks for the
 * viewer, the roadmap section must keep reading as unbuilt work, and the two
 * radiographs must stay announced, sized and resolved through the deploy base.
 *
 * Copy assertions are deliberately loose. The page's wording is reviewed by
 * hand and rewritten often, so these tests pin the claims that must not quietly
 * disappear - the educational-only scope, the privacy guarantee, the future
 * tense on the roadmap - rather than the sentences carrying them.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import useBoneVisionStore from '../stores/useBoneVisionStore';

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

    /*
      The walk below is only a real test of the outline if the outline actually
      nests - a page of an h1 and a row of h2s would satisfy it for the wrong
      reason. Removing the scope section took an h2 with h3 children out of the
      document and the roadmap section puts one back, so the third level has to
      still be reachable, and reachable without a jump.
    */
    expect(levels).toContain(3);

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

  it('loads nothing until the user asks for the viewer', async () => {
    const user = userEvent.setup();
    const initializeDemo = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi.fn();
    useBoneVisionStore.setState({ initializeDemo });
    vi.stubGlobal('fetch', fetchSpy);

    /*
      Upload mode, which is where a visitor who clicked "Upload your X-ray" and
      came back leaves the store. It is the state with the strongest pull
      towards an eager reload - the demo content has been cleared and the page
      is advertising it again - and it is the only state in which the click
      below has observable work to do, since `setMode('demo')` in demo mode is
      a deliberate no-op.
    */
    useBoneVisionStore.getState().prepareUpload();

    render(<LandingPage />);

    // The demo radiograph is ~836KB. Fetching it behind a page the visitor may
    // never leave is bandwidth spent on their behalf without being asked.
    expect(initializeDemo).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    /*
      And not because there is nothing here that could have loaded: the same
      render wires a control that does exactly that load, on demand. Clicking
      it drives the spies the two assertions above lean on, so their silence is
      the page deferring the work rather than a mock that was never live. This
      mattered when the page mounted the region picker and still matters now
      that the only network-capable code left is behind these buttons.
    */
    await user.click(firstButton(/try the demo/i));
    expect(initializeDemo).toHaveBeenCalledTimes(1);
  });

  it('gives every action a real control and a visible focus ring', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    const controls = [
      ...screen.getAllByRole('button'),
      ...screen.getAllByRole('link'),
    ];

    /*
      One population: every action on this page is an HTML button or anchor, so
      every one of them can carry a Tailwind focus ring and is held to it. The
      tag check is the part that keeps that true - a control painted on
      something else, an SVG node for instance, takes no CSS outline and has
      nothing for `focus-visible:ring-*` to apply to, so it would need its own
      indicator and would fail here rather than slipping through unchecked.
    */
    expect(controls.length).toBeGreaterThan(0);

    for (const control of controls) {
      expect(['BUTTON', 'A']).toContain(control.tagName);
      expect(control.className).toMatch(/focus-visible:ring-2/);
    }

    // Keyboard reach: the first Tab from the document body has to land on a
    // control, not nowhere.
    await user.tab();
    expect(controls).toContain(document.activeElement);
  });

  it('states the educational-only scope and the privacy guarantee', () => {
    render(<LandingPage />);

    /*
      The scope boundary, asserted on substance rather than phrasing. It used to
      have a card of its own in the middle of the page; the footer line is what
      carries it now, and it is the sentence the roadmap section below must not
      outgrow. Same boundary EducationalPanel's standing disclaimer draws, so a
      visitor cannot meet a softer version here and a firmer one inside the
      product.
    */
    expect(
      screen.getByText(/educational use only, and not a medical device/i)
    ).toBeInTheDocument();

    // The privacy guarantee is a real property of the implementation, so it is
    // stated outright: once in the capability card, once in the footer.
    expect(
      screen.getByText(/decoded and drawn inside the browser/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/processed\s+in your browser and are not transmitted/i)
    ).toBeInTheDocument();

    // Honest coverage: one traced radiograph, named for what it actually is,
    // rather than an implied whole-body library.
    expect(
      screen.getByText(/traced region by region/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/dorsoplantar projection/i).length
    ).toBeGreaterThan(0);
  });

  it('shows the demo radiograph itself, as content rather than decoration', () => {
    render(<LandingPage />);

    const images = screen.getAllByRole('img', { hidden: false });

    // Both frames, and both in the hero now: the forefoot crop and the whole
    // foot beside it. A visitor deciding whether this tool reads their kind of
    // image should be able to see one without scrolling.
    expect(images).toHaveLength(2);

    for (const image of images) {
      // Content images, so they must be announced, and named for what they
      // show rather than for the file they came from.
      expect(image).not.toHaveAttribute('aria-hidden');
      expect(image.getAttribute('alt')).toMatch(/radiograph/i);

      /*
        Pages serves this app from /BoneVision/, so a bare "/landing/..." would
        resolve in dev and 404 in production - a failure that only appears after
        deploy, which this project has already been bitten by once.
        `import.meta.env.BASE_URL` is the existing fix, used by the store for
        the demo image and the bone map, and vite.config.ts sets `base` to
        '/BoneVision/' for tests too, so this assertion genuinely distinguishes
        the two spellings rather than passing on a base of '/'.
      */
      const src = image.getAttribute('src') ?? '';
      expect(src.startsWith(import.meta.env.BASE_URL)).toBe(true);
      expect(src).toMatch(/landing\/xray-\w+\.webp$/);

      // Intrinsic size declared, so the box is reserved before the bytes land.
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
      expect(image).toHaveAttribute('decoding', 'async');

      // Neither defers, because neither can afford to: both sit above the fold
      // now that the below-the-fold copy of the whole-foot frame is gone, and
      // lazy-loading an image the page opens on shows an empty panel first.
      expect(image).not.toHaveAttribute('loading', 'lazy');
    }
  });

  it('marks decorative artwork as hidden from assistive tech', () => {
    render(<LandingPage />);

    const svgs = Array.from(document.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);

    // Every vector on the page is now a glyph or a wordmark, sitting beside
    // text that already carries the meaning, so the rule is blanket: none of
    // them is announced. An interactive SVG would have to be named instead and
    // would have to come back here for its own branch.
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('presents the roadmap as work that does not exist yet', () => {
    render(<LandingPage />);

    // `aria-labelledby` makes it a named region, so the heading announces the
    // section before any of its contents are read out.
    const roadmap = screen.getByRole('region', { name: /what.s next/i });

    // The two directions, and only two: a roadmap padded out to fill a row
    // reads as a promise rather than a plan.
    const list = within(roadmap).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(roadmap).getByRole('heading', {
        name: /train on real biological data/i,
      })
    ).toBeInTheDocument();
    expect(
      within(roadmap).getByRole('heading', { name: /look unusual/i })
    ).toBeInTheDocument();

    /*
      Tense is what this test is really for. Someone who reads only the second
      card heading - "point out the parts of an X-ray that look unusual" -
      could take it for a feature of the current build, so the section denies
      that outright, each entry is stage labelled above its own heading, and
      the denial sits ahead of the cards in document order rather than in a
      footnote under them.
    */
    const leadIn = within(roadmap).getByText(/neither item below is built/i);
    expect(
      leadIn.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);
    expect(within(roadmap).getByText(/^planned$/i)).toBeInTheDocument();
    expect(within(roadmap).getByText(/^further out$/i)).toBeInTheDocument();
    expect(
      within(roadmap).getByText(/nothing on your image is assessed today/i)
    ).toBeInTheDocument();

    /*
      The regulatory caveat, which is not optional framing here: software that
      marks findings on a medical image is a device, not a feature, and the
      footer's "not a medical device" has to stay true with this section on the
      page. One sentence carrying both halves - what it would take, and that
      this is the hard part - so a rewrite cannot drop one and keep the other.
    */
    const caveat = within(roadmap).getByText(/regulated\s*medical device/i);
    expect(caveat).toHaveTextContent(/clinical validation/i);
    expect(caveat).toHaveTextContent(/difficult/i);
  });
});
