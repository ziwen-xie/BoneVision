/**
 * Header
 *
 * Sticky application header with BoneVision branding, tagline, a demo/upload
 * mode toggle wired to the Zustand store, and a demo-data badge.
 *
 * _Requirements: 9.1, 9.5, 7.5, 7.6_
 */

import useBoneVisionStore from '../stores/useBoneVisionStore';
import BoneMark from './BoneMark';

export interface HeaderProps {
  className?: string;
}

function Header({ className = '' }: HeaderProps) {
  const mode = useBoneVisionStore((state) => state.mode);
  const setMode = useBoneVisionStore((state) => state.setMode);
  const isDemo = mode === 'demo';

  const toggleMode = () => {
    setMode(isDemo ? 'upload' : 'demo');
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 shadow-medical backdrop-blur ${className}`.trim()}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary-50">
            <BoneMark />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold leading-tight text-primary-700">
              BoneVision
            </p>
            <p className="truncate text-sm text-neutral-600">
              Understanding your X-ray, one bone at a time
            </p>
          </div>
        </div>

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
