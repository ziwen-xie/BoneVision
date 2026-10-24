/**
 * UploadHandler Component
 *
 * Drag-and-drop plus file-picker entry point for the user's own X-ray, and the
 * owner of the validate -> load -> store -> choose-body-part flow.
 *
 * Pipeline (Task 21.2)
 * --------------------
 * 1. `validateFile` checks format and the 10MB ceiling.
 * 2. DICOM is intercepted here (see below).
 * 3. `loadImage` decodes the file and reports its intrinsic dimensions.
 * 4. `validateImageDimensions` rejects anything above 4K.
 * 5. `loadXray(file)` commits the image to the store, which also flips `mode`
 *    to 'upload'.
 * 6. The BodyPartSelector opens so the right bone map can be loaded.
 *
 * Steps 3 and 5 both read the file, because the store's `loadXray` takes a
 * `File` and does its own decode. Validating before committing is the point:
 * an oversized image must never reach the viewer. The duplicated decode is a
 * local, in-memory cost on a file already capped at 10MB. A store action that
 * accepted a ready-made `ImageData` would remove it.
 *
 * On DICOM
 * --------
 * `.dcm` stays in the accepted types, because `validationService` accepts it
 * and turning it away as an "invalid format" would be a lie about a legitimate
 * medical format. But `imageService.parseDICOM` is still a stub that throws, so
 * a DICOM file is caught before decoding and answered with a plain "not yet
 * supported" message instead of the "file may be corrupted" error a decode
 * attempt would produce. The UI labels DICOM as coming soon for the same
 * reason.
 *
 * Accessibility:
 * - The dashed region is a pointer-only drop target (`noClick`/`noKeyboard`);
 *   the labelled button is the real control, so keyboard users get one
 *   unambiguous path and no duplicate file dialogs.
 * - Errors render inline in a `role="alert"` region, announced on change.
 * - Contrast checked against WCAG AA (4.5:1 normal text) using the palette in
 *   tailwind.config.js:
 *     neutral-900 on white ............ ~18.9:1
 *     neutral-800 on white ............ ~15.1:1
 *     neutral-700 on white ............ ~10.4:1
 *     neutral-600 on white ............  ~7.8:1
 *     white on primary-600 ............  ~6.8:1  (upload button)
 *     success-800 on success-50 .......  ~7.6:1  (privacy notice)
 *     danger-700 on danger-50 .........  ~7.4:1  (error region)
 *
 * _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 14.1, 14.5, 14.6, 15.1, 15.3, 15.4_
 */

import { useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useBoneVisionStore } from '../stores';
import { loadImage } from '../services/imageService';
import {
  validateFile,
  validateImageDimensions,
} from '../services/validationService';
import { ERROR_MESSAGES, type UploadHandlerProps } from '../types';
import BodyPartSelector from './BodyPartSelector';

/**
 * MIME type -> extensions map for react-dropzone. Mirrors
 * `FILE_CONSTRAINTS.ACCEPTED_MIME_TYPES` / `ACCEPTED_FORMATS`.
 */
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/dicom': ['.dcm'],
};

const DICOM_NOT_SUPPORTED_MESSAGE =
  'DICOM (.dcm) support is coming soon. For now, please export the image as a JPEG or PNG and upload that.';

const MULTIPLE_FILES_MESSAGE =
  'Please drop a single X-ray image at a time.';

/** A DICOM file by MIME type or, when the browser reports none, by extension. */
function isDicom(file: File): boolean {
  return (
    file.type.toLowerCase() === 'application/dicom' ||
    file.name.toLowerCase().endsWith('.dcm')
  );
}

/** Turns react-dropzone's own pre-validation rejections into user-facing copy. */
function describeRejections(rejections: readonly FileRejection[]): string {
  const codes = new Set(
    rejections.flatMap((rejection) =>
      rejection.errors.map((error) => error.code)
    )
  );

  if (codes.has('too-many-files')) {
    return MULTIPLE_FILES_MESSAGE;
  }

  return ERROR_MESSAGES.INVALID_FORMAT;
}

function PrivacyNotice() {
  return (
    <aside
      aria-labelledby="upload-privacy-title"
      className="mt-6 flex gap-3 rounded-lg border border-success-200 bg-success-50 p-4"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-5 w-5 shrink-0 text-success-800"
      >
        <path
          fillRule="evenodd"
          d="M10 1a4 4 0 0 0-4 4v2H5.5A1.5 1.5 0 0 0 4 8.5v8A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 7H14V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Zm-1 5a1 1 0 0 0-2 0v2a1 1 0 0 0 2 0v-2Z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <h3
          id="upload-privacy-title"
          className="text-xs font-semibold uppercase tracking-wide text-success-900"
        >
          Your X-ray stays on your device
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-success-800">
          BoneVision opens your image entirely inside this browser tab. It is
          never uploaded to a server, never sent to anyone else, and is not
          saved anywhere on this device. Close or reload the tab and the image is
          gone from memory.
        </p>
      </div>
    </aside>
  );
}

export default function UploadHandler({
  onUploadComplete,
}: UploadHandlerProps) {
  const loadXray = useBoneVisionStore((state) => state.loadXray);

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /** Name of the file the error refers to, successful or not. */
  const [attemptedFileName, setAttemptedFileName] = useState<string | null>(
    null
  );
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  /**
   * The file that made it into the store but has no body part yet. Kept
   * separate from `attemptedFileName` so a later failed attempt cannot relabel
   * the image that is actually loaded, and local rather than derived from the
   * store's `bodyPart`, which demo mode has already set to 'foot' before the
   * user uploads anything.
   */
  const [unmappedFileName, setUnmappedFileName] = useState<string | null>(null);

  /**
   * Runs the full validate -> load -> store sequence for one file.
   *
   * Errors are surfaced inline rather than through a toast: Task 25.2 owns the
   * toast system and may lift these messages into it later. Until then an
   * inline `role="alert"` keeps the specific failure next to the control that
   * caused it, which Requirement 1.5 asks for.
   */
  const processFile = async (file: File) => {
    setError(null);
    setAttemptedFileName(file.name);

    // 1. Format and size (Requirements 1.1, 1.2).
    const fileCheck = validateFile(file);
    if (!fileCheck.valid) {
      setError(fileCheck.errorMessage ?? ERROR_MESSAGES.INVALID_FORMAT);
      return;
    }

    // 2. DICOM passes validation but cannot be decoded yet. Say so plainly
    //    instead of letting the decode fail with a misleading message.
    if (isDicom(file)) {
      setError(DICOM_NOT_SUPPORTED_MESSAGE);
      return;
    }

    setIsProcessing(true);

    try {
      // 3. Decode to learn the real pixel dimensions.
      const imageData = await loadImage(file);

      // 4. Reject oversized images before they reach the viewer.
      const dimensionCheck = validateImageDimensions(
        imageData.width,
        imageData.height
      );
      if (!dimensionCheck.valid) {
        setError(dimensionCheck.errorMessage ?? ERROR_MESSAGES.IMAGE_TOO_LARGE);
        return;
      }

      // 5. Commit to the store; this also switches `mode` to 'upload'.
      await loadXray(file);

      // 6. Ask which body part it is, so the right bone map can load.
      setUnmappedFileName(file.name);
      setIsSelectorOpen(true);
    } catch (caught) {
      console.error('Failed to process uploaded X-ray', caught);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong while opening that image. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      accept: ACCEPTED_TYPES,
      multiple: false,
      maxFiles: 1,
      // The dashed area is a drop target only. The button below is the single
      // accessible way to open the picker, which avoids the root and the button
      // both firing the file dialog.
      noClick: true,
      noKeyboard: true,
      disabled: isProcessing,
      onDrop: (acceptedFiles, fileRejections) => {
        const file = acceptedFiles[0];

        if (!file) {
          // Rejected by react-dropzone before our own checks ran, so there is
          // no single filename to attribute the message to.
          setAttemptedFileName(null);
          setError(
            fileRejections.length > 0
              ? describeRejections(fileRejections)
              : ERROR_MESSAGES.INVALID_FORMAT
          );
          return;
        }

        void processFile(file);
      },
    });

  const handleSelectorSelected = () => {
    setIsSelectorOpen(false);
    setUnmappedFileName(null);
    onUploadComplete();
  };

  // Dismissing without choosing leaves the image loaded but unmapped, so the
  // reopen affordance below explains what is still missing.
  const handleSelectorDismissed = () => setIsSelectorOpen(false);

  const dropZoneStateClasses = isDragReject
    ? 'border-danger-400 bg-danger-50'
    : isDragActive
      ? 'border-primary-500 bg-primary-50'
      : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50';

  return (
    <section
      aria-labelledby="upload-handler-title"
      className="mx-auto w-full max-w-xl rounded-xl border border-neutral-200 bg-white p-6 shadow-medical-lg sm:p-8"
    >
      <h2
        id="upload-handler-title"
        className="font-display text-2xl font-bold leading-tight text-neutral-900"
      >
        Upload your X-ray
      </h2>
      <p className="mt-2 text-base leading-relaxed text-neutral-800">
        Drop an image below, or browse for one, and BoneVision will walk you
        through the bones it shows.
      </p>

      <div
        {...getRootProps()}
        className={`mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${dropZoneStateClasses}`}
      >
        {/* react-dropzone's input. Visually hidden, opened by the button. */}
        <input {...getInputProps()} aria-label="Choose an X-ray image file" />

        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-primary-600"
        >
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>

        <p className="mt-4 text-base font-semibold text-neutral-900">
          {isDragActive
            ? isDragReject
              ? 'That file type will not work'
              : 'Drop to open this X-ray'
            : 'Drag an X-ray image here'}
        </p>

        <button
          type="button"
          onClick={open}
          disabled={isProcessing}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-primary-700"
        >
          {isProcessing && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          {isProcessing ? 'Opening image…' : 'Browse for a file'}
        </button>

        {/* Limits stated up front, not only in an error after the fact. */}
        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          JPEG or PNG, up to 10MB.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          DICOM (.dcm) files are accepted here but cannot be opened yet —
          support is coming soon.
        </p>
      </div>

      {/*
        Inline error region. Task 25.2 introduces the global toast system and may
        move these messages there; the region stays mounted so assistive tech
        announces changes rather than a container appearing.
      */}
      <div role="alert" aria-live="assertive" className="mt-4 empty:mt-0">
        {error && (
          <p className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm leading-relaxed text-danger-700">
            {attemptedFileName && (
              <span className="font-semibold">{attemptedFileName}: </span>
            )}
            {error}
          </p>
        )}
      </div>

      {/* Shown after the selector is dismissed without a choice: the image is
          in the store but nothing is mapped to it yet. */}
      {unmappedFileName && !isSelectorOpen && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-sm leading-relaxed text-neutral-700">
            <span className="font-semibold">{unmappedFileName}</span> is loaded.
            Tell BoneVision which body part it shows to start exploring.
          </p>
          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            className="flex-none rounded-md border border-primary-600 px-3 py-2 text-sm font-semibold text-primary-700 transition-colors duration-150 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Choose body part
          </button>
        </div>
      )}

      <PrivacyNotice />

      {isSelectorOpen && (
        <BodyPartSelector
          onSelected={handleSelectorSelected}
          onDismiss={handleSelectorDismissed}
        />
      )}
    </section>
  );
}
