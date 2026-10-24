# Implementation Plan: BoneVision

## Overview

BoneVision is a browser-based educational web application that combines X-ray image visualization with interactive 3D anatomical models. This implementation plan breaks down the development into discrete, manageable tasks that build incrementally from project foundation through feature implementation to polish and optimization.

The application uses React 18+ with TypeScript, React Three Fiber for 3D rendering, Zustand for state management, and Tailwind CSS for styling. All tasks focus on code implementation, testing, and configuration - no deployment or user acceptance testing is included.

## Tasks

- [x] 1. Initialize project structure and install dependencies
  - Create new Vite project with React and TypeScript template
  - Install core dependencies: react, react-dom, typescript, vite
  - Install 3D dependencies: @react-three/fiber, @react-three/drei, three
  - Install state management: zustand
  - Install styling: tailwindcss, postcss, autoprefixer
  - Install utilities: react-dropzone
  - Set up TypeScript configuration with strict mode
  - Configure Vite for optimal development experience
  - _Requirements: 10.1, 10.4_

- [x] 2. Set up project directory structure and core configuration files
  - Create directory structure: src/components, src/services, src/stores, src/types, src/utils, public/config, public/models, public/demo
  - Set up Tailwind CSS configuration with healthcare color theme
  - Create TypeScript interface definitions file (types.ts)
  - Set up ESLint and Prettier for code quality
  - Create .gitignore with appropriate exclusions
  - _Requirements: 9.1, 10.1_

- [x] 3. Define core TypeScript interfaces and types
  - [x] 3.1 Create domain model interfaces
    - Define Point, PolygonRegion, BoneInfo, BoneMappingEntry, MappingConfig interfaces
    - Define ImageData interface for X-ray images
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 3.2 Create state management interfaces
    - Define BoneVisionStore interface with all state properties and actions
    - Define store slice interfaces if using modular store pattern
    - _Requirements: All (state management is central to all features)_
  
  - [x] 3.3 Create component prop interfaces
    - Define props interfaces for XRayViewer, ModelViewer, EducationalPanel, UploadHandler
    - Define props for interactive overlay and bone model components
    - _Requirements: 1.1-1.7, 2.1-2.6, 3.1-3.6, 6.1-6.7_

- [x] 4. Implement Zustand state management store
  - [x] 4.1 Create main BoneVisionStore with Zustand
    - Implement state properties: selectedBoneId, hoveredBoneId, mode, bodyPart, xrayImage, cameraPosition, etc.
    - Implement actions: setSelectedBone, setHoveredBone, loadXray, setBodyPart, focusBone, reset
    - Add loading and error state management
    - _Requirements: 2.1-2.6, 5.1-5.6_
  
  - [ ]* 4.2 Write unit tests for store actions
    - Test state updates for selection and hover actions
    - Test mode switching and reset functionality
    - _Requirements: 2.1-2.6, 5.1-5.6_

- [x] 5. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement validation service
  - [x] 6.1 Create validationService.ts with file validation functions
    - Implement validateFile function: check file type (JPEG, PNG, DICOM), check file size (max 10MB)
    - Implement validateImageDimensions function: check max 4K resolution
    - Define descriptive error messages constant
    - Return ValidationResult with valid boolean and errorMessage
    - _Requirements: 1.1, 1.2, 1.5, 14.1_
  
  - [ ]* 6.2 Write unit tests for validation service
    - Test valid file types (JPEG, PNG, DICOM)
    - Test invalid file types rejection
    - Test file size boundary conditions (under 10MB, at 10MB, over 10MB)
    - Test image dimension limits
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 7. Implement image processing service
  - [x] 7.1 Create imageService.ts with image loading functions
    - Implement loadImage function using FileReader API for JPEG/PNG
    - Implement loadImageFromUrl function for demo mode
    - Create ImageData object with url, width, height, format properties
    - Handle image orientation and aspect ratio
    - _Requirements: 1.3, 1.4, 7.1, 7.2_
  
  - [ ]* 7.2 Write unit tests for image service
    - Test loading valid JPEG and PNG images
    - Test aspect ratio preservation
    - Test error handling for corrupted images
    - _Requirements: 1.3, 1.4_

- [x] 8. Implement point-in-polygon utility for region detection
  - [x] 8.1 Create geometry utilities in utils/geometry.ts
    - Implement isPointInPolygon using ray casting algorithm
    - Implement scaleCoordinates for coordinate system conversion
    - Add helper functions for bounding box calculations
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ]* 8.2 Write comprehensive unit tests for point-in-polygon
    - Test points clearly inside convex polygon
    - Test points clearly outside polygon
    - Test points on polygon edges and vertices
    - Test with concave polygons (notched shapes)
    - Test coordinate scaling with various aspect ratios
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 9. Create mapping service for region-to-bone associations
  - [x] 9.1 Implement mappingService.ts
    - Implement loadMapping function to fetch JSON configuration
    - Implement getBoneAtPoint function using point-in-polygon detection
    - Implement getRegionForBone function for reverse lookup
    - Implement getBoneInfo function to retrieve educational content
    - Implement validateMapping to check mesh references exist
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 9.2 Write unit tests for mapping service
    - Test mapping configuration loading and parsing
    - Test getBoneAtPoint with various coordinates
    - Test validation of mapping against model meshes
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 10. Create foot bone mapping configuration JSON
  - [x] 10.1 Create foot-mapping.json in public/config
    - Define mapping for 15+ foot bones: calcaneus, talus, navicular, cuboid, cuneiforms (3), metatarsals (5), phalanges
    - For each bone, define: id, name, function, commonInjuries array, xrayRegion polygon coordinates, meshId, highlightColor
    - Set reference xrayDimensions (1920x1080)
    - Ensure educational content is written in plain language for non-medical users
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.5, 12.1-12.4_

- [x] 11. Checkpoint - Verify services and utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Acquire and prepare 3D foot bone model
  - [x] 12.1 Source 3D foot bone model
    - Download foot bone model from NIH 3D Print Exchange, SketchFab, or similar medical model repository
    - Ensure model has individual meshes for each bone (not a single merged mesh)
    - Verify licensing allows educational use
    - _Requirements: 3.1, 3.5, 11.1_
  
  - [x] 12.2 Optimize 3D model for web performance
    - Import model into Blender
    - Verify mesh names match meshId values in foot-mapping.json (rename if necessary)
    - Apply Decimate modifier if polygon count exceeds 100k total
    - Export as GLB format with Draco compression enabled
    - Save to public/models/foot-bones.glb
    - Test file size is reasonable for web (target < 5MB)
    - _Requirements: 11.2, 11.3, 11.6_

- [x] 13. Acquire demo X-ray image
  - [x] 13.1 Source demo foot X-ray image
    - Obtain public domain or Creative Commons licensed foot X-ray image
    - Ensure image clearly shows all major foot bones
    - Verify image is suitable for educational demonstration
    - Save as public/demo/foot-xray-demo.jpg
    - _Requirements: 7.1, 7.3_

- [x] 14. Implement X-ray Viewer component
  - [x] 14.1 Create XRayViewer.tsx component
    - Set up component structure with image display and canvas overlay
    - Implement image loading with aspect ratio preservation using object-fit: contain
    - Calculate and store display dimensions with useRef and useEffect
    - Render responsive image container
    - _Requirements: 1.3, 1.4, 8.1, 8.3_
  
  - [x] 14.2 Implement InteractiveOverlay component with canvas
    - Create canvas overlay positioned absolutely over X-ray image
    - Implement coordinate scaling from reference to display dimensions
    - Implement mouse move event handler to detect hovered region
    - Call getBoneAtPoint from mappingService on mouse move
    - Emit hover events to Zustand store
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  
  - [x] 14.3 Implement region highlight rendering on canvas
    - Draw polygon regions on canvas with semi-transparent fill (alpha: 0.3)
    - Use bone highlightColor from mapping configuration
    - Redraw canvas on hoveredBoneId state change
    - Clear canvas when no bone is hovered
    - _Requirements: 2.2, 5.4, 5.5_
  
  - [ ]* 14.4 Write integration tests for X-ray viewer interactions
    - Test hover detection triggers store update
    - Test highlight rendering on canvas
    - Test coordinate scaling at different viewport sizes
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 15. Checkpoint - Verify X-ray viewer functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement 3D Model Viewer with React Three Fiber
  - [x] 16.1 Create ModelViewer.tsx with Canvas setup
    - Set up R3F Canvas component with camera configuration (position: [0, 5, 10], fov: 50)
    - Configure WebGL renderer settings (antialias, clearColor)
    - Add Suspense boundary with loading placeholder
    - Implement WebGL detection and fallback message for unsupported browsers
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 10.6_
  
  - [x] 16.2 Create SceneContent component with lighting and controls
    - Add ambient light (intensity: 0.5)
    - Add two directional lights for realistic shading
    - Add OrbitControls from drei with pan, zoom, rotate enabled
    - Set control limits: minDistance: 5, maxDistance: 50, maxPolarAngle to prevent flipping
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 4.4_
  
  - [x] 16.3 Create BoneModelGroup component to load and render 3D model
    - Use useGLTF hook to load foot-bones.glb
    - Clone scene to avoid shared state issues
    - Traverse scene to extract individual bone meshes
    - Create map of boneId to THREE.Mesh using mapping configuration
    - Render each bone mesh with Interactive wrapper from drei
    - Implement hover and click event handlers
    - _Requirements: 3.1, 3.2, 3.5, 11.2_
  
  - [x] 16.4 Implement bone highlighting in 3D view
    - Subscribe to hoveredBoneId and selectedBoneId from store
    - Apply emissive material properties to highlighted bones
    - Use highlightColor from mapping configuration
    - Set emissiveIntensity to 0.5 for highlights, 0 for normal state
    - Smooth transition using useFrame if desired
    - _Requirements: 5.1, 5.3, 5.6_
  
  - [ ]* 16.5 Write integration tests for 3D model viewer
    - Test model loading completes successfully
    - Test bone meshes are extracted correctly
    - Test hover triggers highlight via emissive material
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 17. Implement camera animation system
  - [x] 17.1 Create CameraAnimator.tsx component
    - Subscribe to cameraPosition, cameraTarget, isAnimatingCamera from store
    - Implement useFrame hook to interpolate camera position and controls target
    - Use cubic ease-out easing function for smooth animation (500ms duration)
    - Set isAnimatingCamera to false when animation completes
    - _Requirements: 2.6, 4.6_
  
  - [x] 17.2 Implement focusBone action in store
    - Calculate bone bounding box from mesh geometry
    - Compute target camera position based on bounding box size and center
    - Set cameraPosition, cameraTarget, and isAnimatingCamera in store
    - _Requirements: 2.6, 4.6_
  
  - [ ]* 17.3 Write unit tests for camera animation
    - Test animation interpolation calculation
    - Test easing function output
    - Test animation completion detection
    - _Requirements: 4.6_

- [x] 18. Implement auto-framing camera on model load
  - [x] 18.1 Calculate bounding box of entire foot model
    - Traverse all bone meshes and compute combined bounding box
    - Calculate center point and maximum dimension
    - _Requirements: 4.5_
  
  - [x] 18.2 Position camera to frame entire model on load
    - Compute camera distance based on model size and FOV
    - Set initial camera position in store
    - Ensure entire model is visible with appropriate padding
    - _Requirements: 4.5_

- [x] 19. Checkpoint - Verify 3D viewer and camera system
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Implement Educational Panel component
  - [x] 20.1 Create EducationalPanel.tsx
    - Subscribe to hoveredBoneId, selectedBoneId, and mappingConfig from store
    - Determine active bone (prioritize hover over selection)
    - Retrieve bone info from mapping configuration
    - Render card layout with bone name as heading, function section, and injuries list
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 20.2 Implement default state content
    - Display "Welcome to BoneVision" heading when no bone is active
    - Show introductory text explaining how to interact
    - Include usage instructions: rotate, zoom, pan controls
    - _Requirements: 6.6_
  
  - [x] 20.3 Style educational panel for accessibility
    - Apply Tailwind classes for card design with shadow and padding
    - Use typography hierarchy: text-2xl for bone name, text-sm for section headings
    - Ensure text contrast meets 4.5:1 ratio for normal text
    - Add smooth fade transition when content changes (transition-opacity)
    - _Requirements: 6.7, 9.1, 9.4, 13.4_
  
  - [ ]* 20.4 Write accessibility tests for educational panel
    - Test text contrast ratios meet WCAG AA standards
    - Test screen reader compatibility with semantic HTML
    - _Requirements: 6.7, 13.4_

- [x] 21. Implement Upload Handler component
  - [x] 21.1 Create UploadHandler.tsx with react-dropzone
    - Set up react-dropzone with file type restrictions (accept: image/jpeg, image/png, application/dicom)
    - Create drop zone UI with dashed border and hover state
    - Add hidden file input triggered by button click
    - Display upload instructions and file size limit
    - _Requirements: 1.1, 1.2_
  
  - [x] 21.2 Implement file validation and processing flow
    - Call validationService.validateFile on file selection
    - Display error toast if validation fails
    - Call imageService.loadImage if validation passes
    - Update store with loaded image data
    - Trigger body part selector on successful upload
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 14.1_
  
  - [x] 21.3 Create BodyPartSelector component
    - Create modal or dropdown UI for body part selection
    - Initially show only "Foot" option
    - On selection, call setBodyPart action in store to load mapping and model
    - Close selector after selection
    - _Requirements: 1.6, 1.7_
  
  - [ ]* 21.4 Write integration tests for upload flow
    - Test valid file upload triggers image display
    - Test invalid file shows error message
    - Test oversized file rejection
    - Test body part selection loads correct model
    - _Requirements: 1.1-1.7_

- [x] 22. Implement bidirectional synchronized highlighting
  - [x] 22.1 Implement X-ray hover triggers 3D highlight
    - In InteractiveOverlay, call setHoveredBone on mouse move with detected bone ID
    - In BoneModelGroup, subscribe to hoveredBoneId and apply emissive highlight
    - Verify highlight appears within 100ms
    - _Requirements: 5.1_
  
  - [x] 22.2 Implement 3D hover triggers X-ray highlight
    - In BoneModelGroup Interactive components, call setHoveredBone on pointer over/out
    - In InteractiveOverlay, subscribe to hoveredBoneId and draw canvas highlight
    - Verify highlight appears within 100ms
    - _Requirements: 5.2_
  
  - [x] 22.3 Implement highlight color consistency
    - Ensure both X-ray canvas and 3D emissive material use same highlightColor from mapping config
    - Test visual consistency across both views
    - _Requirements: 5.5_
  
  - [ ]* 22.4 Write integration tests for synchronized highlighting
    - Test hover on X-ray triggers 3D highlight
    - Test hover on 3D triggers X-ray highlight
    - Test moving cursor away clears all highlights
    - Test highlight timing is within 100ms
    - _Requirements: 5.1-5.6_

- [x] 23. Checkpoint - Verify synchronized interaction
  - Ensure all tests pass, ask the user if questions arise.

- [x] 24. Implement Demo Mode functionality
  - [x] 24.1 Add mode state and control to store
    - Add mode: 'demo' | 'upload' to store state
    - Implement action to toggle between demo and upload mode
    - On demo mode activation, load demo X-ray and foot model
    - _Requirements: 7.1, 7.2, 7.6_
  
  - [x] 24.2 Implement demo mode initialization
    - Create function to load demo content: foot-xray-demo.jpg and foot-bones.glb
    - Load foot-mapping.json configuration
    - Set mode indicator in UI
    - Ensure demo loads within 5 seconds total
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.4_
  
  - [x] 24.3 Create demo mode indicator and toggle control
    - Display badge or banner indicating "Demo Mode" when active
    - Add button or link to exit demo and switch to upload mode
    - Style with appropriate visual treatment
    - _Requirements: 7.5, 7.6_
  
  - [ ]* 24.4 Write integration tests for demo mode
    - Test demo mode loads within 5 seconds
    - Test all 15+ interactive regions are functional
    - Test toggle between demo and upload mode
    - _Requirements: 7.1-7.6_

- [ ] 25. Implement error handling and user feedback
  - [ ] 25.1 Create error boundary component
    - Implement React error boundary to catch component errors
    - Display friendly error UI with refresh option
    - Log errors to console for debugging
    - _Requirements: 14.6_
  
  - [ ] 25.2 Implement toast notification system
    - Add toast library (react-hot-toast) or create custom toast component
    - Configure toast position (top-right), duration, and dismissal
    - Create toast helper functions for error, success, info messages
    - _Requirements: 1.5, 14.1, 14.3_
  
  - [ ] 25.3 Add error handling for model loading
    - Catch errors in useGLTF hook
    - Display error message in Model Viewer area
    - Add retry button to attempt reload
    - _Requirements: 11.5, 14.2_
  
  - [ ] 25.4 Add loading indicators
    - Show spinner during X-ray image processing
    - Show spinner during 3D model loading
    - Display progress feedback if loading exceeds 1 second
    - _Requirements: 9.7, 10.3_
  
  - [ ]* 25.5 Write tests for error handling
    - Test error boundary catches and displays error UI
    - Test model load failure shows error message and retry
    - Test upload validation errors show appropriate toasts
    - _Requirements: 14.1-14.6_

- [ ] 26. Implement responsive layout and split-screen design
  - [x] 26.1 Create SplitLayout.tsx component
    - Implement flex container for side-by-side layout on desktop (width >= 768px)
    - Each child (X-ray viewer, 3D viewer) occupies 50% width on desktop
    - Stack vertically on mobile/tablet (width < 768px)
    - Use Tailwind responsive classes: flex-col md:flex-row
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 26.2 Implement responsive viewport handling
    - Add window resize event listener to update layout
    - Ensure layout adjustment completes within 500ms
    - Update canvas and 3D viewer dimensions on resize
    - _Requirements: 8.5_
  
  - [ ] 26.3 Ensure touch gesture support for 3D controls
    - Test OrbitControls on touch-enabled device or browser devtools mobile mode
    - Verify single-finger drag rotates, two-finger pinch zooms, two-finger drag pans
    - _Requirements: 4.7, 8.6_
  
  - [ ]* 26.4 Write responsive layout tests
    - Test split-screen layout at desktop width
    - Test stacked layout at mobile width
    - Test viewport resize triggers layout adjustment
    - _Requirements: 8.1-8.5_

- [x] 27. Implement Header component and application branding
  - [x] 27.1 Create Header.tsx component
    - Display "BoneVision" branding with logo or icon
    - Add navigation controls: Demo Mode toggle button
    - Style with consistent healthcare color scheme
    - Make header sticky or fixed at top
    - _Requirements: 9.1, 9.5_
  
  - [x] 27.2 Create App.tsx root component
    - Set up application layout with Header, SplitLayout, and EducationalPanel
    - Wrap application in error boundary
    - Initialize Zustand store provider if needed
    - Set up initial routing or mode selection
    - _Requirements: 9.5_

- [ ] 28. Checkpoint - Verify complete application flow
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 29. Apply UI polish and visual design enhancements
  - [ ] 29.1 Create healthcare-themed Tailwind color palette
    - Define primary, secondary, and accent colors in tailwind.config.js
    - Use medical blues, greens, and neutrals
    - Ensure colors meet accessibility contrast requirements
    - _Requirements: 9.1, 13.4_
  
  - [ ] 29.2 Add smooth transitions and animations
    - Apply transition classes to interactive elements (buttons, cards)
    - Set animation duration between 100ms-500ms
    - Add hover effects to buttons and interactive regions
    - Implement fade transitions for educational panel content changes
    - _Requirements: 9.2, 9.3_
  
  - [ ] 29.3 Refine typography and visual hierarchy
    - Configure Tailwind font families (use system font stack or import Google Fonts)
    - Apply consistent text sizes: headings (text-2xl, text-xl), body (text-base), labels (text-sm)
    - Apply font weights for hierarchy: bold for headings, normal for body
    - _Requirements: 9.4_
  
  - [ ] 29.4 Style Educational Panel with card design
    - Apply shadow, rounded corners, and padding
    - Use bg-white or subtle background color
    - Add section dividers or spacing between function and injuries sections
    - _Requirements: 9.6_
  
  - [ ] 29.5 Add focus indicators for keyboard navigation
    - Apply visible focus ring styles (ring-2 ring-blue-500)
    - Test tab navigation through all interactive elements
    - Ensure focus indicators are visible and clear
    - _Requirements: 13.2_

- [ ] 30. Implement accessibility features
  - [ ] 30.1 Add ARIA labels and roles
    - Add aria-label to interactive regions, buttons, and controls
    - Use semantic HTML: header, main, section, article
    - Add role attributes where needed for screen reader compatibility
    - _Requirements: 13.3_
  
  - [ ] 30.2 Add keyboard navigation support
    - Ensure all controls are keyboard accessible (Tab, Enter, Space)
    - Test full navigation flow with keyboard only
    - Add keyboard shortcuts for common actions (optional enhancement)
    - _Requirements: 13.1, 13.2_
  
  - [ ] 30.3 Test browser zoom support
    - Test application at 200% browser zoom
    - Ensure layout doesn't break and text remains readable
    - Fix any overflow or layout issues
    - _Requirements: 13.6_
  
  - [ ]* 30.4 Run automated accessibility audit
    - Install and run axe-core or Lighthouse accessibility audit
    - Fix reported violations (contrast, alt text, ARIA)
    - Verify WCAG AA compliance
    - _Requirements: 13.1-13.6_

- [ ] 31. Set up testing infrastructure
  - [x] 31.1 Configure Vitest for unit testing
    - Install vitest, @testing-library/react, @testing-library/jest-dom
    - Create vitest.config.ts with React environment
    - Set up test utilities and helpers
    - Configure coverage thresholds: 80% overall, 95% for critical paths
    - _Requirements: All (testing validates all requirements)_
  
  - [ ] 31.2 Set up Playwright for integration testing
    - Install @playwright/test
    - Create playwright.config.ts with browsers (chromium, firefox, webkit)
    - Set up test fixtures and page objects
    - Create test data and mock files
    - _Requirements: All (integration tests validate end-to-end flows)_

- [ ] 32. Optimize performance and bundle size
  - [ ] 32.1 Implement code splitting for routes and components
    - Use React.lazy() for lazy loading of non-critical components
    - Split by route if routing is added in future
    - Measure bundle size with vite build --report
    - _Requirements: 10.3, 10.4_
  
  - [ ] 32.2 Optimize 3D model loading
    - Ensure GLB uses Draco compression
    - Preload model with useGLTF.preload() in parent component
    - Implement level-of-detail (LOD) if model exceeds 100k polygons
    - _Requirements: 11.3, 11.6_
  
  - [ ] 32.3 Monitor and optimize frame rate
    - Use React DevTools Profiler to identify performance bottlenecks
    - Memoize expensive computations with useMemo
    - Use useCallback for event handlers to prevent re-renders
    - Ensure 30+ FPS during camera manipulation
    - _Requirements: 3.4, 10.2_
  
  - [ ]* 32.4 Run Lighthouse performance audit
    - Run Lighthouse audit in Chrome DevTools
    - Ensure FCP < 1.5s, LCP < 2.5s, TTI < 3.5s
    - Fix performance issues identified by audit
    - _Requirements: 10.2, 10.4_

- [ ] 33. Create privacy notice and documentation
  - [ ] 33.1 Add privacy notice to upload interface
    - Create modal or inline text explaining local processing
    - State that images are not transmitted to servers
    - Explain that images are cleared when tab is closed
    - Add "I understand" acknowledgment button
    - _Requirements: 15.1, 15.4_
  
  - [ ] 33.2 Create README.md for project
    - Document project overview and purpose
    - List features and technology stack
    - Provide setup and installation instructions
    - Include screenshots or demo GIF
    - Document architecture and component structure
    - Add credits for 3D models and X-ray images
    - _Requirements: All (documentation covers entire project)_
  
  - [ ] 33.3 Create HACKATHON.md for submission
    - Describe project for Hackachusetts Healthcare & Biotech track
    - Highlight Kiro usage: spec workflow, task execution, testing
    - List implemented features and demonstrate requirements coverage
    - Include technical challenges and solutions
    - Add demo video link or instructions
    - _Requirements: All (submission document)_

- [ ] 34. Final testing and quality assurance
  - [ ]* 34.1 Run complete unit test suite
    - Execute all unit tests with coverage report
    - Verify 80%+ overall coverage, 95%+ for critical services
    - Fix any failing tests
    - _Requirements: All_
  
  - [ ]* 34.2 Run complete integration test suite
    - Execute Playwright tests on all browsers
    - Verify all user flows work end-to-end
    - Fix any failing tests
    - _Requirements: All_
  
  - [ ]* 34.3 Manual testing on multiple browsers
    - Test on Chrome, Firefox, Safari, Edge latest versions
    - Verify WebGL support and fallback messages
    - Test on tablet device or touch simulation
    - _Requirements: 10.1, 3.6, 4.7_
  
  - [ ]* 34.4 Performance and accessibility final validation
    - Run final Lighthouse audit
    - Run final axe-core accessibility audit
    - Verify all metrics meet targets
    - _Requirements: 10.2, 10.4, 13.1-13.6_

- [ ] 35. Final checkpoint and submission preparation
  - Ensure all tests pass, all features are implemented, and documentation is complete.
  - Review HACKATHON.md and README.md for clarity and completeness.
  - Prepare demo video or live demo walkthrough.
  - Verify application runs smoothly in production build (npm run build && npm run preview).

- [x] 36. Build the marketing landing page
  - [x] 36.1 Add client-side routing between landing page and viewer
    - Introduce hash-based routing so deep links survive GitHub Pages without a 404.html rewrite fallback
    - Route `#/` to the landing page and `#/viewer` to the existing split-view application
    - Preserve the existing demo-mode initialization when entering the viewer
    - _Requirements: 9.5_

  - [x] 36.2 Create LandingPage component with hero and calls to action
    - Hero section with product name, one-line value proposition, and supporting subcopy
    - Primary "Try the demo" action routing to the viewer in demo mode
    - Secondary "Upload your X-ray" action routing to the viewer in upload mode
    - _Requirements: 9.1, 9.4, 9.5, 7.6, 1.1_

  - [x] 36.3 Add capability and audience sections
    - Communicate the synchronized 2D/3D highlighting, plain-language explanations, and local-only image processing
    - Describe who benefits: patients, students, and clinicians explaining findings
    - Include a short "how it works" sequence covering upload, choose body part, explore
    - State the educational-not-diagnostic scope and the client-side privacy guarantee
    - _Requirements: 6.5, 9.1, 9.4, 15.4_

  - [x] 36.4 Make the landing page responsive and accessible
    - Single-column stacking below 768px, multi-column from 768px up
    - Semantic landmarks, logical heading order, and keyboard-reachable actions with visible focus
    - All text at WCAG AA contrast
    - _Requirements: 8.1, 8.2, 8.7, 13.1, 13.2, 13.3, 13.4_

- [x] 37. Add body region picker
  - [x] 37.1 Create BodyRegionPicker component
    - Render a flat, inline SVG body silhouette with selectable regions (no 3D geometry, no external model asset)
    - Regions with a mapping configuration are selectable; everything else is visibly marked unavailable rather than selectable-but-broken
    - Hover and focus states on each region, with the region name shown
    - _Requirements: 1.6, 1.7, 9.1, 9.2_

  - [x] 37.2 Wire region selection to body part loading
    - Selecting an available region calls the existing setBodyPart flow to load that region's mapping configuration
    - Only the foot is available, so the picker must make the current coverage honest and obvious
    - _Requirements: 1.7, 12.6_

  - [x] 37.3 Make the picker accessible
    - Keyboard reachable with visible focus, arrow-key or tab traversal between regions
    - ARIA labels per region and aria-disabled for unavailable regions so they stay discoverable
    - WCAG AA contrast on all labels and the selected state
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 37.4 Record the model-sourcing decision
    - Document that the navigation affordance is a 2D silhouette rather than a 3D skeleton, and why
    - Capture BodyParts3D as the CC BY 4.0 source for any future real per-bone geometry, with its attribution requirement
    - _Requirements: 11.1, 11.4_

## Notes

- Tasks marked with `*` are optional test tasks that can be skipped for faster MVP, but are recommended for hackathon quality
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Property-based testing is NOT included as BoneVision is primarily a UI/UX application with side effects
- Testing strategy: 70% integration tests (user workflows), 25% unit tests (services/utilities), 5% manual tests
- All image processing happens client-side for privacy (no backend required)
- Demo mode enables immediate demonstration without requiring X-ray uploads
- Core implementation tasks are NOT marked optional and must be completed
- Deployment and user acceptance testing are explicitly excluded per workflow constraints

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["4.1", "6.1", "7.1", "8.1", "10.1", "12.1", "13.1"] },
    { "id": 3, "tasks": ["4.2", "6.2", "7.2", "8.2", "9.1", "12.2"] },
    { "id": 4, "tasks": ["9.2", "14.1", "16.1", "20.1", "21.1", "27.1"] },
    { "id": 5, "tasks": ["14.2", "16.2", "20.2", "21.2", "24.1", "25.1", "26.1", "27.2"] },
    { "id": 6, "tasks": ["14.3", "16.3", "20.3", "21.3", "24.2", "25.2", "29.1"] },
    { "id": 7, "tasks": ["14.4", "16.4", "20.4", "21.4", "24.3", "25.3", "26.2", "29.2", "30.1"] },
    { "id": 8, "tasks": ["16.5", "17.1", "22.1", "24.4", "25.4", "26.3", "29.3", "30.2"] },
    { "id": 9, "tasks": ["17.2", "18.1", "22.2", "25.5", "26.4", "29.4", "30.3", "31.1"] },
    { "id": 10, "tasks": ["17.3", "18.2", "22.3", "29.5", "30.4", "31.2"] },
    { "id": 11, "tasks": ["22.4", "32.1", "33.1"] },
    { "id": 12, "tasks": ["32.2", "33.2"] },
    { "id": 13, "tasks": ["32.3", "33.3"] },
    { "id": 14, "tasks": ["32.4", "34.1"] },
    { "id": 15, "tasks": ["34.2"] },
    { "id": 16, "tasks": ["34.3"] },
    { "id": 17, "tasks": ["34.4"] },
    { "id": 18, "tasks": ["35"] }
  ]
}
```
