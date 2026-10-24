/**
 * Tests for the viewer's header.
 *
 * Two jobs, and they have to coexist: the branding is the way back to the
 * landing page, and the mode toggle is the way between the demo and an upload.
 * The toggle already had coverage through App's route tests; what is new, and
 * what is easy to break by restyling the header, is the home link.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Header from './Header';
import useSkeletonMapStore from '../stores/useSkeletonMapStore';

beforeEach(() => {
  window.location.hash = '#/viewer';
  useSkeletonMapStore.getState().reset();
});

afterEach(() => {
  window.location.hash = '';
});

describe('Header', () => {
  it('turns the branding into a link home', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const home = screen.getByRole('link', { name: /home/i });

    /*
      A real anchor, so it is middle-clickable and copyable, and the hash form,
      so it works on GitHub Pages: '/' there would leave the project subpath
      entirely.
    */
    expect(home.tagName).toBe('A');
    expect(home).toHaveAttribute('href', '#/');

    // The wordmark and the mark are both inside it, so the target is the whole
    // block rather than the glyph.
    expect(home).toHaveTextContent('SkeletonMap');
    expect(home.querySelector('svg')).not.toBeNull();

    // Keyboard reachable with something visible on arrival.
    await user.tab();
    expect(home).toHaveFocus();
    expect(home.className).toMatch(/focus-visible:ring-2/);
  });

  it('navigates to the landing route when the branding is used', async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole('link', { name: /home/i }));

    expect(window.location.hash).toBe('#/');
  });

  it('keeps the mode toggle and the demo badge working', async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Demo mode out of the box: badge present, toggle offering the way out.
    expect(screen.getByRole('status')).toHaveTextContent(/demo data/i);
    const toggle = screen.getByRole('button', { name: /exit demo mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    expect(useSkeletonMapStore.getState().mode).toBe('upload');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch to demo mode/i })
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
