/**
 * Unit tests for Image Processing Service
 *
 * Tests image loading for JPEG and PNG, from both a `File` upload and a URL.
 *
 * The `FileReader` half of `loadImage` runs against jsdom's real implementation, so the
 * blob-to-data-URL step is genuinely exercised rather than simulated; only the failure
 * case needs a stub, since a well-formed blob never makes a real reader fail.
 *
 * `Image` always has to be stubbed: jsdom does not decode image bytes, so a real
 * `HTMLImageElement` fires neither `onload` nor `onerror` for a data URL and the promise
 * would hang. The stub is the narrowest thing that unblocks the code under test - it
 * reports dimensions and resolves or fails - and the format detection, ImageData assembly
 * and error mapping being asserted are all real.
 *
 * Requirements: 1.3, 1.4
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadImage, loadImageFromUrl, parseDICOM } from './imageService';

/** What the stubbed `Image` should do once `src` is assigned. */
type ImageOutcome = { width: number; height: number } | 'error';

/**
 * Replaces `globalThis.Image` with a stand-in that settles asynchronously, the way a real
 * image decode does, so the service's `onload`/`onerror` handlers are attached before
 * either fires.
 */
function stubImage(outcome: ImageOutcome): void {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 0;
    height = 0;
    private value = '';

    get src(): string {
      return this.value;
    }

    set src(next: string) {
      this.value = next;

      queueMicrotask(() => {
        if (outcome === 'error') {
          this.onerror?.();
          return;
        }

        this.width = outcome.width;
        this.height = outcome.height;
        this.onload?.();
      });
    }
  }

  vi.stubGlobal('Image', FakeImage);
}

/**
 * Replaces `globalThis.FileReader` with one that reports the given outcome: either a hard
 * `onerror`, or an `onload` carrying an empty result (which a real reader can do for a
 * file that disappeared mid-read, and which the service maps to the same message).
 */
function stubFileReader(outcome: 'error' | 'empty'): void {
  class StubFileReader {
    onload: ((event: { target: { result: string | null } }) => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | null = null;

    readAsDataURL(): void {
      queueMicrotask(() => {
        if (outcome === 'error') {
          this.onerror?.();
          return;
        }

        this.onload?.({ target: { result: null } });
      });
    }
  }

  vi.stubGlobal('FileReader', StubFileReader);
}

function makeFile(name: string, type: string, contents = 'bytes'): File {
  return new File([new Blob([contents], { type })], name, { type });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('imageService', () => {
  describe('loadImage', () => {
    it('should load a valid JPEG image from File', async () => {
      stubImage({ width: 1920, height: 1080 });

      const result = await loadImage(makeFile('test.jpg', 'image/jpeg', 'fake-jpeg-data'));

      expect(result.format).toBe('jpeg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      // The real FileReader produced this, so it is a genuine data URL rather than a
      // value the test handed back to itself.
      expect(result.url).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('should load a valid PNG image from File', async () => {
      stubImage({ width: 2048, height: 1536 });

      const result = await loadImage(makeFile('test.png', 'image/png', 'fake-png-data'));

      expect(result.format).toBe('png');
      expect(result.width).toBe(2048);
      expect(result.height).toBe(1536);
    });

    it('should preserve aspect ratio in ImageData', async () => {
      stubImage({ width: 1600, height: 900 });

      const result = await loadImage(makeFile('test.jpg', 'image/jpeg'));

      expect(result.width / result.height).toBeCloseTo(16 / 9, 5);
    });

    it('should reject unsupported file types', async () => {
      await expect(loadImage(makeFile('test.txt', 'text/plain'))).rejects.toThrow(
        'Unsupported file type'
      );
    });

    it('should handle corrupted image files', async () => {
      stubImage('error');

      await expect(loadImage(makeFile('bad.jpg', 'image/jpeg', 'corrupted'))).rejects.toThrow(
        'Failed to load image'
      );
    });

    it('should handle FileReader errors', async () => {
      stubFileReader('error');

      await expect(loadImage(makeFile('test.jpg', 'image/jpeg'))).rejects.toThrow(
        'Failed to read file'
      );
    });

    it('should reject when the reader returns an empty result', async () => {
      stubFileReader('empty');

      await expect(loadImage(makeFile('test.jpg', 'image/jpeg'))).rejects.toThrow(
        'Failed to read file'
      );
    });

    it('should accept the image/jpg MIME variant', async () => {
      stubImage({ width: 800, height: 600 });

      const result = await loadImage(makeFile('test.jpg', 'image/jpg'));

      expect(result.format).toBe('jpeg');
    });
  });

  describe('loadImageFromUrl', () => {
    it('should load a JPEG image from URL', async () => {
      stubImage({ width: 1920, height: 1080 });

      const result = await loadImageFromUrl('/demo/foot-xray-demo.jpg');

      expect(result).toEqual({
        url: '/demo/foot-xray-demo.jpg',
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });
    });

    it('should load a PNG image from URL', async () => {
      stubImage({ width: 2560, height: 1440 });

      const result = await loadImageFromUrl('https://example.com/image.png');

      expect(result.format).toBe('png');
      expect(result.url).toBe('https://example.com/image.png');
    });

    it('should reject URLs with unsupported formats', async () => {
      await expect(loadImageFromUrl('https://example.com/document.pdf')).rejects.toThrow(
        'Unsupported image format'
      );
    });

    it('should handle network errors', async () => {
      stubImage('error');

      await expect(
        loadImageFromUrl('https://invalid-domain.example/image.jpg')
      ).rejects.toThrow('Failed to load image from URL');
    });

    it('should handle different URL formats (.jpeg extension)', async () => {
      stubImage({ width: 1024, height: 768 });

      const result = await loadImageFromUrl('/images/test.jpeg');

      expect(result.format).toBe('jpeg');
    });

    it('should detect DICOM from a .dcm URL', async () => {
      stubImage({ width: 512, height: 512 });

      const result = await loadImageFromUrl('/scans/study.dcm');

      expect(result.format).toBe('dicom');
    });
  });

  describe('parseDICOM', () => {
    it('should throw error indicating DICOM is not yet supported', async () => {
      await expect(parseDICOM(makeFile('test.dcm', 'application/dicom'))).rejects.toThrow(
        'DICOM format is not yet supported'
      );
    });
  });
});
