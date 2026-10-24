/**
 * InteractiveOverlay Component
 *
 * A canvas layer that sits exactly on top of the rendered X-ray image box and
 * provides:
 *  - hit testing of pointer position against bone polygons (Task 14.2)
 *  - semi-transparent highlight rendering for hovered/selected bones (Task 14.3)
 *  - keyboard cycling through bones with a live-region announcement
 *
 * Coordinate systems
 * ------------------
 * Polygon coordinates in the mapping configuration live in a reference space
 * (`mappingConfig.xrayDimensions`). The canvas works in the *rendered* image
 * box space, whose size is passed in as `width`/`height` by XRayViewer. All
 * drawing scales reference -> rendered via `scaleCoordinates`, and hit testing
 * hands rendered-space coordinates to `getBoneAtPoint`, which applies the same
 * scale internally. Because this component is positioned inside the same
 * element as the <img>, canvas-local coordinates are image-local coordinates.
 *
 * Requirements: 2.1, 2.2, 2.4, 2.5, 5.4, 5.5, 13.1, 13.2, 13.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useBoneVisionStore } from '../stores';
import { getBoneAtPoint } from '../services/mappingService';
import { scaleCoordinates } from '../utils/geometry';
import type { InteractiveOverlayProps, MappingConfig } from '../types';

/** Fill opacity for a highlighted region (design: alpha 0.3). */
const FILL_ALPHA = 0.3;
/** Stroke opacity - higher than the fill so the outline reads on a noisy radiograph. */
const STROKE_ALPHA = 0.9;
/** Outline width in CSS pixels. */
const STROKE_WIDTH = 2;

/**
 * Converts a hex color (#RGB or #RRGGBB) to an rgba() string with the given alpha.
 * Non-hex values are returned untouched so named/rgb colors still work.
 */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();

  if (!hex.startsWith('#')) {
    return hex;
  }

  let normalized = hex.slice(1);

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (normalized.length !== 6) {
    return hex;
  }

  const value = Number.parseInt(normalized, 16);

  if (Number.isNaN(value)) {
    return hex;
  }

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws a single bone region: translucent fill plus a crisper outline in the
 * same highlight color.
 */
function drawRegion(
  ctx: CanvasRenderingContext2D,
  config: MappingConfig,
  boneId: string,
  width: number,
  height: number
): void {
  const bone = config.bones.find((candidate) => candidate.id === boneId);

  if (!bone) {
    return;
  }

  const points = scaleCoordinates(
    bone.xrayRegion.coordinates,
    config.xrayDimensions.width,
    config.xrayDimensions.height,
    width,
    height
  );

  const [start, ...rest] = points;

  // A polygon needs at least three vertices to enclose an area.
  if (!start || points.length < 3) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);

  for (const [x, y] of rest) {
    ctx.lineTo(x, y);
  }

  ctx.closePath();

  ctx.fillStyle = withAlpha(bone.highlightColor, FILL_ALPHA);
  ctx.fill();

  ctx.lineWidth = STROKE_WIDTH;
  ctx.strokeStyle = withAlpha(bone.highlightColor, STROKE_ALPHA);
  ctx.stroke();
}

export default function InteractiveOverlay({
  width,
  height,
  className = '',
}: InteractiveOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mappingConfig = useBoneVisionStore((state) => state.mappingConfig);
  const hoveredBoneId = useBoneVisionStore((state) => state.hoveredBoneId);
  const selectedBoneId = useBoneVisionStore((state) => state.selectedBoneId);
  const setHoveredBone = useBoneVisionStore((state) => state.setHoveredBone);
  const setSelectedBone = useBoneVisionStore((state) => state.setSelectedBone);
  const focusBone = useBoneVisionStore((state) => state.focusBone);

  /** Latest pointer position, consumed by the next animation frame. */
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  /** Pending animation frame id, used to throttle hit testing to one per frame. */
  const frameRef = useRef<number | null>(null);

  /** Text announced to screen readers while cycling bones with the keyboard. */
  const [announcement, setAnnouncement] = useState('');

  // --------------------------------------------------------------------------
  // Rendering (Task 14.3)
  // --------------------------------------------------------------------------

  /**
   * Sizes the backing store for the current device pixel ratio and repaints the
   * active regions. Runs whenever the hover/selection state, the rendered box
   * size, or the mapping configuration changes.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || width <= 0 || height <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    // Assigning width/height also clears the canvas, so only touch it on change.
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    // Work in CSS pixels regardless of screen density.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!mappingConfig) {
      return;
    }

    // Selection persists underneath; hover paints on top.
    if (selectedBoneId && selectedBoneId !== hoveredBoneId) {
      drawRegion(ctx, mappingConfig, selectedBoneId, width, height);
    }

    if (hoveredBoneId) {
      drawRegion(ctx, mappingConfig, hoveredBoneId, width, height);
    }
  }, [width, height, hoveredBoneId, selectedBoneId, mappingConfig]);

  // --------------------------------------------------------------------------
  // Hover detection (Task 14.2)
  // --------------------------------------------------------------------------

  /**
   * Resolves the bone under the last known pointer position. Scheduled on an
   * animation frame so a fast mouse sweep performs at most one hit test and at
   * most one store update per frame.
   */
  const processHover = useCallback(() => {
    frameRef.current = null;

    const canvas = canvasRef.current;
    const point = pointerRef.current;

    if (!canvas || !point || !mappingConfig) {
      return;
    }

    const boneId = getBoneAtPoint(point.x, point.y, mappingConfig, width, height);

    // Set imperatively to avoid a React render on every boundary crossing.
    canvas.style.cursor = boneId ? 'pointer' : 'default';

    if (boneId !== useBoneVisionStore.getState().hoveredBoneId) {
      setHoveredBone(boneId);
    }
  }, [mappingConfig, width, height, setHoveredBone]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;

      if (!canvas || !mappingConfig) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(processHover);
      }
    },
    [mappingConfig, processHover]
  );

  const handleMouseLeave = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    pointerRef.current = null;

    const canvas = canvasRef.current;

    if (canvas) {
      canvas.style.cursor = 'default';
    }

    setHoveredBone(null);
  }, [setHoveredBone]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;

      if (!canvas || !mappingConfig) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const boneId = getBoneAtPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        mappingConfig,
        width,
        height
      );

      if (!boneId) {
        return;
      }

      setSelectedBone(boneId);
      focusBone(boneId);
    },
    [mappingConfig, width, height, setSelectedBone, focusBone]
  );

  // Cancel any frame still queued when the overlay unmounts.
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Keyboard access
  // --------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      const bones = mappingConfig?.bones;

      if (!bones || bones.length === 0) {
        return;
      }

      const { hoveredBoneId: hovered, selectedBoneId: selected } =
        useBoneVisionStore.getState();
      const activeId = hovered ?? selected;
      const currentIndex = bones.findIndex((bone) => bone.id === activeId);

      let nextIndex: number;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % bones.length;
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = currentIndex <= 0 ? bones.length - 1 : currentIndex - 1;
          break;

        case 'Enter':
        case ' ':
          if (activeId) {
            event.preventDefault();
            setSelectedBone(activeId);
            focusBone(activeId);
          }
          return;

        case 'Escape':
          setHoveredBone(null);
          setAnnouncement('');
          return;

        default:
          return;
      }

      event.preventDefault();

      const nextBone = bones[nextIndex];

      if (!nextBone) {
        return;
      }

      setHoveredBone(nextBone.id);
      setAnnouncement(nextBone.name);
    },
    [mappingConfig, setHoveredBone, setSelectedBone, focusBone]
  );

  const handleBlur = useCallback(() => {
    setHoveredBone(null);
    setAnnouncement('');
  }, [setHoveredBone]);

  const boneCount = mappingConfig?.bones.length ?? 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${className}`}
        tabIndex={0}
        aria-label={`Interactive X-ray bone regions. ${boneCount} bones available. Use the arrow keys to move between bones and Enter to select one.`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />

      {/* Announces the active bone while navigating with the keyboard. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
