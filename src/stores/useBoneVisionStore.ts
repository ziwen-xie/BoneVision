/**
 * BoneVision Zustand Store
 * 
 * Central state management for the BoneVision application.
 * Manages bone selection, hover states, X-ray image data, 3D viewer state,
 * camera control, and loading/error states.
 */

import { create } from 'zustand';
import type { BoneVisionStore, ImageData } from '../types';
import {
  getBoneBounds,
  getSkeletonBounds,
  getViewportAspect,
} from '../models/boneBoundsRegistry';
import {
  BONE_FOCUS_PADDING,
  CAMERA_INITIAL_POSITION,
  MODEL_FRAME_PADDING,
  computeFraming,
} from '../utils/cameraFraming';

/**
 * The sample radiograph demo mode loads.
 *
 * "X-ray of normal right foot by dorsoplantar projection" by Mikael Häggström,
 * via Wikimedia Commons, CC0 1.0. The credit is rendered in-product while demo
 * mode is active (see App.tsx), not only recorded here.
 */
const DEMO_XRAY_URL = `${import.meta.env.BASE_URL}demo/foot-xray-demo.jpg`;

/**
 * The in-flight `initializeDemo` call, if any. Cleared on settle, so a later
 * demo -> upload -> demo trip reloads rather than resolving instantly against a
 * store that `prepareUpload` has since emptied.
 */
let demoInitialization: Promise<void> | null = null;

/**
 * Bumped by every mode transition. A demo load that started under an older
 * generation knows, when it finishes, that the user has moved on - see the
 * staleness check in `initializeDemo`.
 */
let modeGeneration = 0;

const useBoneVisionStore = create<BoneVisionStore>((set, get) => ({
  // ============================================================================
  // Interaction State
  // ============================================================================
  selectedBoneId: null,
  hoveredBoneId: null,

  // ============================================================================
  // Application Mode
  // ============================================================================
  mode: 'demo',
  bodyPart: null,

  // ============================================================================
  // X-ray Viewer State
  // ============================================================================
  xrayImage: null,
  xrayScale: 1,

  // ============================================================================
  // 3D Viewer State
  // ============================================================================
  cameraPosition: [...CAMERA_INITIAL_POSITION],
  cameraTarget: [0, 0, 0],
  isAnimatingCamera: false,

  // ============================================================================
  // Configuration
  // ============================================================================
  mappingConfig: null,

  // ============================================================================
  // Loading and Error State
  // ============================================================================
  isLoadingModel: false,
  isLoadingXray: false,
  errorMessage: null,

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Set the currently selected bone ID
   * Used when user clicks on a bone in either X-ray or 3D view
   */
  setSelectedBone: (id: string | null) => {
    set({ selectedBoneId: id });
  },

  /**
   * Set the currently hovered bone ID
   * Used for real-time highlighting as user moves cursor
   */
  setHoveredBone: (id: string | null) => {
    set({ hoveredBoneId: id });
  },

  /**
   * Switch between demo mode and upload mode.
   *
   * `mode` is the single source of truth for which half of the app is live, so
   * everything that has to happen on a mode change happens here rather than in
   * whichever component noticed. Header only has to call `setMode`.
   *
   * Entering demo mode reloads the demo content; entering upload mode clears it
   * (see `prepareUpload` for why). Re-asserting the current mode is a no-op, so
   * a caller that mirrors state back into the store cannot trigger a reload.
   *
   * Requirements: 7.1, 7.2, 7.6
   */
  setMode: (mode: 'demo' | 'upload') => {
    if (get().mode === mode) {
      return;
    }

    if (mode === 'demo') {
      void get().initializeDemo();
    } else {
      get().prepareUpload();
    }
  },

  /**
   * Load everything demo mode needs and switch to it.
   *
   * This is the one path to a loaded demo - App calls it on mount and `setMode`
   * calls it when the user comes back from upload mode, so returning to the demo
   * runs exactly the same sequence as the first load instead of a component
   * reimplementing it.
   *
   * The bone map and the sample image are independent fetches, so they run
   * together: sequentially their latencies add up against the 5s budget for the
   * whole demo load.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 10.4
   */
  initializeDemo: async () => {
    // StrictMode double-invokes mount effects, and the demo button can be
    // clicked twice. Concurrent calls share one load - but only while demo mode
    // is still what the user wants; a request made after a trip through upload
    // mode has to reload the content `prepareUpload` cleared.
    if (demoInitialization && get().mode === 'demo') {
      return demoInitialization;
    }

    const generation = ++modeGeneration;

    const run = async (): Promise<void> => {
      set({
        mode: 'demo',
        selectedBoneId: null,
        hoveredBoneId: null,
        errorMessage: null,
      });

      const [mapping, xray] = await Promise.allSettled([
        get().setBodyPart('foot'),
        get().loadXray(DEMO_XRAY_URL),
      ]);

      // A slow demo load can finish after the user has already left for upload
      // mode, and `loadXray` writes the demo image into the store as it
      // resolves - putting the sample radiograph back under the upload screen,
      // which is exactly what `prepareUpload` exists to prevent. So re-assert
      // the current intent instead of reporting results nobody asked for.
      if (generation !== modeGeneration) {
        if (get().mode === 'upload') {
          get().prepareUpload();
        }
        return;
      }

      // Both actions already set `errorMessage` on failure, but both also clear
      // it when they start, so running them in parallel lets them overwrite
      // each other's message. The combined message is therefore written once,
      // here, after both have settled.
      //
      // Rejections are reported rather than rethrown: the caller is a mount
      // effect or a button handler, and an unhandled rejection would tell the
      // user nothing. The failure lives in `errorMessage`, which App renders.
      const failures: string[] = [];

      if (mapping.status === 'rejected') {
        console.error(
          'Demo mode: failed to load the foot bone map',
          mapping.reason
        );
        failures.push('the foot bone map');
      }

      if (xray.status === 'rejected') {
        console.error(
          'Demo mode: failed to load the sample X-ray',
          xray.reason
        );
        failures.push('the sample X-ray');
      }

      if (failures.length > 0) {
        set({
          errorMessage: `Could not load ${failures.join(' and ')} for the demo. Reload the page to try again.`,
        });
      }
    };

    // Only clears the slot if this call still owns it, so a newer load started
    // after a mode round-trip is not dropped by an older one finishing.
    const promise: Promise<void> = run().finally(() => {
      if (demoInitialization === promise) {
        demoInitialization = null;
      }
    });

    demoInitialization = promise;

    return promise;
  },

  /**
   * Switch to upload mode and clear the demo content behind it.
   *
   * Clearing is the point. Flipping the mode flag alone would leave the sample
   * radiograph on screen with its foot regions still live, so the user would be
   * looking at a stranger's anatomy in the panel that is supposed to be showing
   * theirs. In a tool people use to understand their own X-ray that is not a
   * cosmetic glitch, it is a wrong answer, so the image, the selection and the
   * hover state all go.
   *
   * `bodyPart` and `mappingConfig` go too: the polygons in foot-mapping.json are
   * traced against the demo radiograph, so leaving them loaded would draw demo
   * bone outlines over an uploaded image before the user has even said what it
   * shows. BodyPartSelector reloads them once the body part is confirmed.
   *
   * The cost is reloading the demo on the way back, which `initializeDemo`
   * handles.
   *
   * Requirements: 7.6, 1.6, 15.1
   */
  prepareUpload: () => {
    modeGeneration += 1;

    set({
      mode: 'upload',
      xrayImage: null,
      xrayScale: 1,
      selectedBoneId: null,
      hoveredBoneId: null,
      bodyPart: null,
      mappingConfig: null,
      errorMessage: null,
    });
  },

  /**
   * Load an X-ray image from a File or URL
   * Handles both uploaded files and demo mode pre-loaded images
   */
  loadXray: async (image: File | string) => {
    set({ isLoadingXray: true, errorMessage: null });

    try {
      let imageData: ImageData;

      if (typeof image === 'string') {
        // Load from URL (demo mode)
        imageData = await loadImageFromUrl(image);
      } else {
        // Load from File (upload mode)
        imageData = await loadImageFromFile(image);
      }

      set({
        xrayImage: imageData,
        isLoadingXray: false,
        mode: typeof image === 'string' ? 'demo' : 'upload',
      });
    } catch (error) {
      set({
        isLoadingXray: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Failed to load X-ray image',
      });
      throw error;
    }
  },

  /**
   * Set the body part type and load corresponding mapping configuration
   * Currently only supports 'foot', but designed for future expansion
   */
  setBodyPart: async (part: 'foot') => {
    set({ isLoadingModel: true, errorMessage: null, bodyPart: part });

    try {
      // Load mapping configuration for the specified body part
      const response = await fetch(`${import.meta.env.BASE_URL}config/${part}-mapping.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load mapping configuration for ${part}`);
      }

      const mappingConfig = await response.json();

      set({
        mappingConfig,
        isLoadingModel: false,
      });
    } catch (error) {
      set({
        isLoadingModel: false,
        bodyPart: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Failed to load body part configuration',
      });
      throw error;
    }
  },

  /**
   * Focus camera on a specific bone
   *
   * Frames the bone's bounding box: the camera is pulled back along a fixed view
   * direction far enough for the box (plus padding for anatomical context) to fit the
   * field of view. Geometry comes from `boneBoundsRegistry`, which the 3D layer fills in
   * once the skeleton is built - see that module for why the store reads a registry
   * instead of owning meshes.
   *
   * If the 3D viewer is not mounted yet there is nothing to measure, so the bone is still
   * selected (the X-ray overlay and educational panel respond) and the camera is left
   * alone rather than animating to a guessed position.
   *
   * Requirements: 2.6, 4.6
   */
  focusBone: (boneId: string) => {
    const { mappingConfig } = get();

    if (!mappingConfig) {
      console.warn('Cannot focus bone: mapping configuration not loaded');
      return;
    }

    const bone = mappingConfig.bones.find((b) => b.id === boneId);

    if (!bone) {
      console.warn(`Cannot focus bone: bone ID "${boneId}" not found in mapping`);
      return;
    }

    const bounds = getBoneBounds(boneId);

    if (!bounds) {
      set({ selectedBoneId: boneId });
      return;
    }

    const framing = computeFraming(bounds, {
      padding: BONE_FOCUS_PADDING,
      aspect: getViewportAspect(),
    });

    set({
      cameraPosition: framing.position,
      cameraTarget: framing.target,
      isAnimatingCamera: true,
      selectedBoneId: boneId,
    });
  },

  /**
   * Frame the entire skeleton
   *
   * Called by the 3D layer once the model is built, so the whole foot is in view at the
   * right scale instead of whatever the initial camera guess happened to show.
   *
   * Defaults to snapping rather than animating: on first load the framed view should be
   * what the user sees on the first paint, not the end of a half-second fly-out.
   *
   * Requirements: 4.5
   */
  frameModel: (options?: { animate?: boolean }) => {
    const bounds = getSkeletonBounds();

    if (!bounds) {
      console.warn('Cannot frame model: no bone geometry registered');
      return;
    }

    const framing = computeFraming(bounds, {
      padding: MODEL_FRAME_PADDING,
      aspect: getViewportAspect(),
    });

    set({
      cameraPosition: framing.position,
      cameraTarget: framing.target,
      isAnimatingCamera: options?.animate ?? false,
    });
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ errorMessage: null });
  },

  /**
   * Reset store to initial state
   * Clears all selection, hover, and loaded data
   */
  reset: () => {
    set({
      selectedBoneId: null,
      hoveredBoneId: null,
      mode: 'demo',
      bodyPart: null,
      xrayImage: null,
      xrayScale: 1,
      cameraPosition: [...CAMERA_INITIAL_POSITION],
      cameraTarget: [0, 0, 0],
      isAnimatingCamera: false,
      mappingConfig: null,
      isLoadingModel: false,
      isLoadingXray: false,
      errorMessage: null,
    });
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load image from a URL (for demo mode)
 */
async function loadImageFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: getFormatFromUrl(url),
      });
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Load image from a File object (for upload mode)
 */
async function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const url = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        resolve({
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: getFormatFromFile(file),
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image from file'));
      };

      img.src = url;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Determine image format from URL
 */
function getFormatFromUrl(url: string): 'jpeg' | 'png' | 'dicom' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.png')) {
    return 'png';
  }
  if (lowerUrl.endsWith('.dcm')) {
    return 'dicom';
  }
  return 'jpeg';
}

/**
 * Determine image format from File object
 */
function getFormatFromFile(file: File): 'jpeg' | 'png' | 'dicom' {
  const type = file.type.toLowerCase();
  if (type === 'image/png') {
    return 'png';
  }
  if (type === 'application/dicom') {
    return 'dicom';
  }
  return 'jpeg';
}

export default useBoneVisionStore;
