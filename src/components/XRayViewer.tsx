/**
 * XRayViewer Component
 *
 * Renders the X-ray currently held in the store on a dark radiographic
 * backdrop, preserving aspect ratio, and overlays the interactive bone regions.
 *
 * Why the rendered box is computed explicitly
 * -------------------------------------------
 * `object-fit: contain` would letterbox the image correctly but would not tell
 * us *where* the pixels landed. The interactive overlay has to align to the
 * exact rendered rectangle, so the fit is computed with `fitImageInContainer`
 * (offset + size) and the image and canvas are both placed inside that
 * rectangle. A ResizeObserver on the container keeps it in sync with layout
 * changes.
 *
 * The demo foot X-ray is tall portrait (1061 x 2431), so the image is fitted by
 * height and centered horizontally; the width clamp below only engages when the
 * panel is too narrow, which keeps wide uploads from overflowing.
 *
 * Requirements: 1.3, 1.4, 8.1, 8.3, 9.7, 13.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSkeletonMapStore } from '../stores';
import { fitImageInContainer } from '../utils/geometry';
import type { XRayViewerProps } from '../types';
import InteractiveOverlay from './InteractiveOverlay';

interface Size {
  width: number;
  height: number;
}

export default function XRayViewer({ className = '' }: XRayViewerProps) {
  const xrayImage = useSkeletonMapStore((state) => state.xrayImage);
  const isLoadingXray = useSkeletonMapStore((state) => state.isLoadingXray);
  const mappingConfig = useSkeletonMapStore((state) => state.mappingConfig);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  const measure = useCallback(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const { width, height } = element.getBoundingClientRect();

    setContainerSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height }
    );
  }, []);

  useEffect(() => {
    measure();

    const element = containerRef.current;

    if (!element) {
      return;
    }

    // ResizeObserver catches panel resizes that a window resize event misses
    // (split-layout changes, sidebar toggles). Fall back where it is missing.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [measure]);

  // The box the image actually occupies. The overlay aligns to this, so it is
  // computed explicitly rather than inferred from the container.
  const renderedBox = fitImageInContainer(
    containerSize.width,
    containerSize.height,
    xrayImage?.width ?? 0,
    xrayImage?.height ?? 0
  );

  const hasRenderedBox = renderedBox.width > 0 && renderedBox.height > 0;
  const hasRegions = Boolean(mappingConfig && mappingConfig.bones.length > 0);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-xray-dark ${className}`}
    >
      {xrayImage && hasRenderedBox && (
        <div
          className="absolute"
          style={{
            left: `${renderedBox.offsetX}px`,
            top: `${renderedBox.offsetY}px`,
            width: `${renderedBox.width}px`,
            height: `${renderedBox.height}px`,
          }}
        >
          <img
            src={xrayImage.url}
            alt={`X-ray radiograph, ${xrayImage.width} by ${xrayImage.height} pixels. Hover or use the arrow keys on the overlay to explore individual bones.`}
            className="block h-full w-full select-none object-contain"
            draggable={false}
          />

          {hasRegions && (
            <InteractiveOverlay
              width={renderedBox.width}
              height={renderedBox.height}
            />
          )}
        </div>
      )}

      {!xrayImage && !isLoadingXray && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-xs text-sm text-neutral-400">
            No X-ray loaded yet. Start the demo or upload an image to begin
            exploring.
          </p>
        </div>
      )}

      {isLoadingXray && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-xray-dark/80"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200/30 border-t-primary-300"
            aria-hidden="true"
          />
          <p className="text-sm text-neutral-200">Loading X-ray…</p>
        </div>
      )}
    </div>
  );
}
