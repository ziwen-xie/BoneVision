/**
 * Header
 *
 * Sticky application header with SkeletonMap branding, tagline, a demo/upload
 * mode toggle wired to the Zustand store, and a demo-data badge. The branding
 * doubles as the link home - see the comment on the anchor for why it is an
 * anchor and why it carries its own accessible name.
 *
 * _Requirements: 9.1, 9.5, 7.5, 7.6, 13.1, 13.2_
 */

import useSkeletonMapStore from '../stores/useSkeletonMapStore';
import SkeletonMapMark from './SkeletonMapMark';

export interface HeaderProps {
  className?: string;
}

function Header({ className = '' }: HeaderProps) {
  const mode = useSkeletonMapStore((state) => state.mode);
  const setMode = useSkeletonMapStore((state) => state.setMode);
  const isDemo = mode === 'demo';

  const toggleMode = () => {
    setMode(isDemo ? 'upload' : 'demo');
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 shadow-medical backdrop-blur ${className}`.trim()}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        {/*
          The branding is the way back out of the viewer, which is where users
          expect a wordmark to take them.

          A plain `<a href="#/">` and not an onClick handler: this is pure
          navigation, so it stays middle-clickable, copyable and openable in a
          new tab, and the browser owns the history entry. The hash form is what
          works on GitHub Pages, where `/` would leave the project subpath and
          `/SkeletonMap/` would be a full page load - see useHashRoute for why
          the whole router lives in the fragment.

          The mark, the wordmark and the tagline are all inside the link, so the
          whole block is one target rather than a 10px-wide logo. That would
          otherwise make the accessible name "SkeletonMap Understanding your
          X-ray, one bone at a time", which reads as a sentence rather than a
          destination, so an explicit label names the destination instead. The
          mark stays `aria-hidden` (its own default) and contributes nothing.
        */}
        <a
          href="#/"
          aria-label="SkeletonMap home page"
          className="-mx-1.5 flex min-w-0 items-center gap-3 rounded-lg px-1.5 py-1 transition-colors duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-50">
            <SkeletonMapMark />
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-lg font-bold leading-tight text-primary-700">
              SkeletonMap
            </span>
            <span className="block truncate text-sm text-neutral-600">
              Understanding your X-ray, one bone at a time
            </span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-3">
          {isDemo && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700"
              role="status"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent-400"
                aria-hidden="true"
              />
              Demo data
            </span>
          )}

          <button
            type="button"
            onClick={toggleMode}
            aria-pressed={isDemo}
            aria-label={
              isDemo
                ? 'Exit demo mode and switch to uploading your own X-ray'
                : 'Switch to demo mode with the sample foot X-ray'
            }
            className="rounded-md bg-primary-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            {isDemo ? 'Upload your X-ray' : 'View demo'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
