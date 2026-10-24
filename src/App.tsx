/**
 * App
 *
 * Application shell and the one place that decides which experience is on
 * screen, driven entirely by the store's `mode`:
 *
 * - upload mode, before an image has been opened -> the UploadHandler, centered
 * - demo mode, or upload mode once the user's image is loaded -> the split view
 *   (X-ray viewer + 3D viewer) with the educational panel
 *
 * Demo content is loaded through the store's `initializeDemo`, not inline here,
 * so coming back from upload mode re-runs the same sequence as the first load.
 *
 * _Requirements: 9.5, 8.1-8.4, 7.1, 7.2, 7.5, 7.6, 1.1, 1.6_
 */

import { useEffect, useState } from 'react';
import Header from './components/Header';
import SplitLayout from './components/SplitLayout';
import XRayViewer from './components/XRayViewer';
import ModelViewer from './components/ModelViewer';
import EducationalPanel from './components/EducationalPanel';
import UploadHandler from './components/UploadHandler';
import useBoneVisionStore from './stores/useBoneVisionStore';

/**
 * Attribution for the demo radiograph, shown only while demo mode is active.
 *
 * CC0 1.0 waives the requirement to credit, so this is here for a different
 * reason: the image is a real person's foot, and a tool that teaches people to
 * read radiographs should say whose film it is showing and that it is not the
 * viewer's own. It doubles as the in-panel demo marker - the Header badge says
 * the session is a demo, this says *this image* is the sample, right next to the
 * anatomy being misattributed if it were missing.
 *
 * Kept to a corner block over the dark X-ray backdrop so it does not compete
 * with the bones. Contrast against the `bg-neutral-900/85` plate, measured for
 * WCAG AA (4.5:1 for normal text):
 *   accent-100  on neutral-900 ... ~14.4:1  (sample-image line)
 *   neutral-200 on neutral-900 ... ~14.4:1  (credit line)
 *   primary-200 on neutral-900 ....~9.2:1   (source link)
 *
 * The block is `pointer-events-none` so it cannot steal hover from the
 * interactive regions underneath; only the link takes pointer events back.
 */
function DemoImageCredit() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-3">
      <div className="max-w-sm rounded-md bg-neutral-900/85 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs font-semibold text-accent-100">
          Sample image — not your X-ray
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-200">
          &ldquo;X-ray of normal right foot by dorsoplantar projection&rdquo; by
          Mikael Häggström, via{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:X-ray_of_normal_right_foot_by_dorsoplantar_projection.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto rounded text-primary-200 underline underline-offset-2 transition-colors duration-150 hover:text-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            Wikimedia Commons
          </a>
          . Public domain under CC0 1.0.
        </p>
      </div>
    </div>
  );
}

function App() {
  const mode = useBoneVisionStore((state) => state.mode);
  const initializeDemo = useBoneVisionStore((state) => state.initializeDemo);
  const errorMessage = useBoneVisionStore((state) => state.errorMessage);
  const clearError = useBoneVisionStore((state) => state.clearError);

  /**
   * Whether the user has opened an image of their own in this upload session.
   * Local rather than derived from `xrayImage`: the body part still has to be
   * confirmed before the split view can map anything, and UploadHandler owns
   * that step and reports completion.
   */
  const [hasCompletedUpload, setHasCompletedUpload] = useState(false);

  // Demo content on first paint. `initializeDemo` collapses the duplicate call
  // StrictMode makes here into a single load, so no local guard is needed.
  useEffect(() => {
    void initializeDemo();
  }, [initializeDemo]);

  // Back to demo mode means the user's image is gone (the store clears it), so
  // the upload screen is unfinished business again.
  useEffect(() => {
    if (mode === 'demo') {
      setHasCompletedUpload(false);
    }
  }, [mode]);

  const isDemo = mode === 'demo';
  const showUpload = mode === 'upload' && !hasCompletedUpload;

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <Header />

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 sm:px-6"
        >
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error message"
            className="rounded px-2 font-semibold text-danger-700 transition-colors duration-150 hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {showUpload ? (
        // Single centered column: there is nothing to put beside the drop zone
        // until an image exists. `items-start` keeps the tall form scrollable
        // from the top on short viewports.
        <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6 lg:items-center">
          <UploadHandler onUploadComplete={() => setHasCompletedUpload(true)} />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <SplitLayout
            className="flex-none lg:flex-1"
            left={
              // Positioning context for the demo credit overlay; XRayViewer
              // fills it.
              <div className="relative h-full w-full">
                <XRayViewer />
                {isDemo && <DemoImageCredit />}
              </div>
            }
            right={<ModelViewer />}
          />

          {/* EducationalPanel brings its own card styling, so this wrapper only
              provides spacing, a divider, and its own scroll context. */}
          <aside
            className="w-full flex-none border-t border-neutral-200 p-4 sm:p-6 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-t-0"
            aria-label="Bone information"
          >
            <EducationalPanel />
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
