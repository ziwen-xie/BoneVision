/**
 * Tests for the route gate in App.
 *
 * The viewer's own internals are tested elsewhere; what matters here is which
 * screen a given fragment produces, and that entering the viewer is what
 * triggers the demo load - not merely opening the site.
 *
 * jsdom has no WebGL, so ModelViewer renders its documented fallback inside the
 * viewer shell. That is enough to tell the two routes apart.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import useSkeletonMapStore from './stores/useSkeletonMapStore';

/**
 * Stand-in for the real demo load. The genuine action fetches the bone map and
 * an 836KB image, neither of which exists in jsdom; stubbing it keeps the test
 * about *whether* the load is requested.
 */
const createDemoStub = () =>
  vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

let initializeDemo: ReturnType<typeof createDemoStub>;

beforeEach(() => {
  window.location.hash = '';
  useSkeletonMapStore.getState().reset();
  initializeDemo = createDemoStub();
  useSkeletonMapStore.setState({ initializeDemo });
});

afterEach(() => {
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('App routing', () => {
  it('shows the landing page with no fragment', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /understand what your x-ray/i })
    ).toBeInTheDocument();
  });

  it('shows the landing page for #/', () => {
    window.location.hash = '#/';

    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /understand what your x-ray/i
    );
  });

  it('does not touch the demo content on the landing route', () => {
    render(<App />);

    expect(initializeDemo).not.toHaveBeenCalled();
  });

  it('shows the viewer shell for #/viewer and loads the demo', () => {
    window.location.hash = '#/viewer';

    render(<App />);

    // The app shell, not the marketing page.
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/demo data/i);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    // A deep link straight to the viewer still gets its content.
    expect(initializeDemo).toHaveBeenCalledTimes(1);
  });

  it('opens the drop zone, without loading the demo, when the store is in upload mode', () => {
    window.location.hash = '#/viewer';
    useSkeletonMapStore.getState().prepareUpload();

    render(<App />);

    // This is the landing page's "Upload your X-ray" path: mode is already
    // upload by the time the viewer mounts, and loading the demo over the top
    // of it would show the sample foot instead of the drop zone.
    expect(initializeDemo).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /choose|select|browse|upload/i })
    ).toBeInTheDocument();
  });

  it('moves from the landing page into the viewer when a call to action is used', async () => {
    const user = userEvent.setup();

    render(<App />);

    const [tryDemo] = screen.getAllByRole('button', { name: /try the demo/i });

    if (!tryDemo) {
      throw new Error('The landing page rendered no demo call to action');
    }

    await user.click(tryDemo);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/demo data/i)
    );
    expect(window.location.hash).toBe('#/viewer');
    expect(initializeDemo).toHaveBeenCalled();
  });

  it('returns to the landing page when the fragment goes back', async () => {
    window.location.hash = '#/viewer';

    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/demo data/i);

    window.location.hash = '#/';

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        /understand what your x-ray/i
      )
    );
  });
});
