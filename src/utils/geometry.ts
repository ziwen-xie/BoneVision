/**
 * Geometry utility functions for point-in-polygon detection and coordinate transformations
 */

import { Point, RenderedImageBox } from '../types';

/**
 * Determines if a point is inside a polygon using the ray casting algorithm.
 * 
 * The algorithm works by casting a ray from the point to infinity (horizontally to the right)
 * and counting how many times it intersects with the polygon edges. If the count is odd,
 * the point is inside; if even, it's outside.
 * 
 * @param point - The point to test
 * @param polygon - Array of points defining the polygon vertices
 * @returns true if the point is inside the polygon, false otherwise
 * 
 * @example
 * const point = { x: 5, y: 5 };
 * const polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
 * isPointInPolygon(point, polygon); // true
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) {
    return false; // A polygon must have at least 3 vertices
  }

  let inside = false;
  
  // Ray casting algorithm: count intersections with edges
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    
    if (!pi || !pj) {
      continue;
    }
    
    const xi = pi.x;
    const yi = pi.y;
    const xj = pj.x;
    const yj = pj.y;

    // Check if the ray from the point intersects with the edge from j to i
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Scales polygon coordinates from reference dimensions to display dimensions.
 * 
 * This is used to map coordinates from the mapping configuration (which uses reference
 * dimensions) to the actual displayed image size (which may be different due to responsive
 * scaling).
 * 
 * @param refCoords - Array of coordinate pairs in reference coordinate system
 * @param refWidth - Reference width (from mapping config)
 * @param refHeight - Reference height (from mapping config)
 * @param displayWidth - Actual display width
 * @param displayHeight - Actual display height
 * @returns Array of scaled coordinate pairs
 * 
 * @example
 * const coords = [[100, 200], [150, 250]];
 * const scaled = scaleCoordinates(coords, 1920, 1080, 960, 540);
 * // Returns [[50, 100], [75, 125]] - scaled by 0.5
 */
export function scaleCoordinates(
  refCoords: [number, number][],
  refWidth: number,
  refHeight: number,
  displayWidth: number,
  displayHeight: number
): [number, number][] {
  const scaleX = displayWidth / refWidth;
  const scaleY = displayHeight / refHeight;

  return refCoords.map(([x, y]) => [x * scaleX, y * scaleY]);
}

/**
 * Converts coordinate pair array to Point array.
 * 
 * @param coords - Array of [x, y] coordinate pairs
 * @returns Array of Point objects
 */
export function coordsToPoints(coords: [number, number][]): Point[] {
  return coords.map(([x, y]) => ({ x, y }));
}

/**
 * Calculates the bounding box of a polygon.
 * 
 * @param polygon - Array of points defining the polygon
 * @returns Bounding box with min/max x and y coordinates
 * 
 * @example
 * const polygon = [{ x: 0, y: 5 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
 * const bbox = getBoundingBox(polygon);
 * // Returns { minX: 0, minY: 0, maxX: 10, maxY: 10 }
 */
export function getBoundingBox(polygon: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (polygon.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  const firstPoint = polygon[0];
  if (!firstPoint) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = firstPoint.x;
  let minY = firstPoint.y;
  let maxX = firstPoint.x;
  let maxY = firstPoint.y;

  for (let i = 1; i < polygon.length; i++) {
    const point = polygon[i];
    if (!point) {
      continue;
    }

    
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculates the center point of a polygon.
 * 
 * @param polygon - Array of points defining the polygon
 * @returns Center point (centroid)
 * 
 * @example
 * const polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
 * const center = getPolygonCenter(polygon);
 * // Returns { x: 5, y: 5 }
 */
export function getPolygonCenter(polygon: Point[]): Point {
  if (polygon.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  for (const point of polygon) {
    sumX += point.x;
    sumY += point.y;
  }

  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  };
}

/**
 * Checks if a point is inside or on the boundary of a bounding box.
 * This is faster than point-in-polygon and can be used for quick rejection tests.
 * 
 * @param point - The point to test
 * @param bbox - The bounding box
 * @returns true if the point is inside or on the boundary
 */
export function isPointInBoundingBox(
  point: Point,
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return (
    point.x >= bbox.minX &&
    point.x <= bbox.maxX &&
    point.y >= bbox.minY &&
    point.y <= bbox.maxY
  );
}

/**
 * Calculates the distance between two points.
 * 
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance between the points
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
/**
 * Fits an image inside a container without distorting it, and reports the exact
 * rectangle the image occupies.
 *
 * The fit is height-first, which suits portrait radiographs such as the demo
 * foot X-ray (1061 x 2431): the image uses the full panel height and is
 * centered horizontally. The width clamp only engages when a height fit would
 * overflow the container horizontally, so landscape images are handled too.
 *
 * Callers need the offsets, not just the size, because interactive overlays
 * must align to the rendered rectangle rather than to the container.
 *
 * @param containerWidth - Container width in CSS pixels
 * @param containerHeight - Container height in CSS pixels
 * @param imageWidth - Intrinsic image width in pixels
 * @param imageHeight - Intrinsic image height in pixels
 * @returns The rendered image box; a zero box if any input is non-positive
 *
 * @example
 * // Portrait image in a wide panel: fits by height, centered horizontally
 * fitImageInContainer(800, 600, 1061, 2431);
 * // Returns { offsetX: 269.11..., offsetY: 0, width: 261.77..., height: 600 }
 */
export function fitImageInContainer(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): RenderedImageBox {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 };
  }

  // Portrait-first: use all available height...
  let scale = containerHeight / imageHeight;

  // ...unless that would make the image wider than the container.
  if (imageWidth * scale > containerWidth) {
    scale = containerWidth / imageWidth;
  }

  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    offsetX: (containerWidth - width) / 2,
    offsetY: (containerHeight - height) / 2,
    width,
    height,
  };
}
